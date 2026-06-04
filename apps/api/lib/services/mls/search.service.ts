import type { Json } from '@voxori/database/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@voxori/database/types';
import { resolveMlsMarket, type MlsMarketConfig } from '@voxori/shared/constants';
import { decryptCredentials } from '../credentials';
import { bridgeCredentialsAvailable, fetchBridgeListings } from './bridge.provider';
import {
  fetchIdxBrokerListings,
  idxBrokerCredentialsAvailable,
  resolveIdxBrokerCredentials,
} from './idx-broker.provider';
import { fetchTrestleListings, trestleCredentialsAvailable } from './trestle.provider';
import {
  dedupeListings,
  integrationMarketId,
  integrationProvider,
  type ListingResult,
  type ListingSearchParams,
  type MlsIntegrationRow,
  type MlsSearchResult,
} from './types';

type DbClient = SupabaseClient<Database>;

async function getActiveMlsIntegrations(
  db: DbClient,
  tenantId: string
): Promise<MlsIntegrationRow[]> {
  const { data } = await db
    .from('integrations')
    .select('id, credentials, config, market_id')
    .eq('tenant_id', tenantId)
    .eq('type', 'mls_idx')
    .eq('is_active', true);

  return (data ?? []) as MlsIntegrationRow[];
}

function sortIntegrationsForSearch(integrations: MlsIntegrationRow[]): MlsIntegrationRow[] {
  return [...integrations].sort((a, b) => {
    const aIdx = integrationProvider(a) === 'idx_broker' ? 0 : 1;
    const bIdx = integrationProvider(b) === 'idx_broker' ? 0 : 1;
    return aIdx - bIdx;
  });
}

function resolveMarketsForSearch(
  integrations: MlsIntegrationRow[],
  explicitMarket?: string | null
): MlsMarketConfig[] {
  if (explicitMarket) {
    return [resolveMlsMarket(explicitMarket)];
  }

  if (integrations.length === 0) {
    return [resolveMlsMarket(process.env.MLS_MARKET)];
  }

  const markets = integrations.map((row) => resolveMlsMarket(integrationMarketId(row)));
  return [...new Map(markets.map((market) => [market.id, market])).values()];
}

function tenantCredentials(integration?: MlsIntegrationRow | null): Record<string, string> {
  if (!integration?.credentials) return {};
  return decryptCredentials(integration.credentials as Json);
}

async function fetchLiveListingsForMarket(
  market: MlsMarketConfig,
  params: ListingSearchParams,
  integration?: MlsIntegrationRow | null
): Promise<ListingResult[]> {
  const creds = tenantCredentials(integration);
  const provider = integration ? integrationProvider(integration) : market.provider;

  if (provider === 'idx_broker') {
    const idxCreds = resolveIdxBrokerCredentials(creds);
    if (idxCreds) {
      return fetchIdxBrokerListings(market, params, idxCreds);
    }
    return [];
  }

  if (provider === 'bridge' && bridgeCredentialsAvailable()) {
    return fetchBridgeListings(market, params);
  }

  if (provider === 'trestle' && trestleCredentialsAvailable()) {
    return fetchTrestleListings(market, params);
  }

  return [];
}

async function searchCachedListings(
  db: DbClient,
  params: ListingSearchParams,
  markets: MlsMarketConfig[]
): Promise<ListingResult[]> {
  const originatingNames = markets.map((m) => m.originatingSystemName);

  let query = db
    .from('listings')
    .select(
      'id, address, price, bedrooms, bathrooms, sqft, status, mls_id, originating_system_name, integration_id'
    )
    .eq('tenant_id', params.tenantId)
    .eq('status', 'active')
    .in('originating_system_name', originatingNames)
    .limit(params.limit ?? 5);

  if (params.minBedrooms) query = query.gte('bedrooms', params.minBedrooms);
  if (params.minBathrooms) query = query.gte('bathrooms', params.minBathrooms);
  if (params.minPrice) query = query.gte('price', params.minPrice);
  if (params.maxPrice) query = query.lte('price', params.maxPrice);
  if (params.minSqft) query = query.gte('sqft', params.minSqft);

  const { data } = await query;

  return (data ?? []).map((row) => {
    const market =
      markets.find((m) => m.originatingSystemName === row.originating_system_name) ??
      resolveMlsMarket(process.env.MLS_MARKET);

    return {
      id: row.id,
      mls_id: row.mls_id,
      address: row.address,
      price: row.price,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      sqft: row.sqft,
      status: row.status,
      originating_system_name: row.originating_system_name,
      market_id: market.id,
      source: 'cache' as const,
    };
  });
}

function integrationByMarket(
  integrations: MlsIntegrationRow[],
  marketId: string
): MlsIntegrationRow | undefined {
  return integrations.find((row) => integrationMarketId(row) === marketId);
}

export async function searchListings(
  db: DbClient,
  params: ListingSearchParams
): Promise<MlsSearchResult> {
  const integrations = sortIntegrationsForSearch(
    await getActiveMlsIntegrations(db, params.tenantId)
  );
  const markets = resolveMarketsForSearch(integrations, params.market);

  const liveResults: ListingResult[] = [];
  for (const market of markets) {
    const integration = integrationByMarket(integrations, market.id);
    const rows = await fetchLiveListingsForMarket(market, params, integration);
    liveResults.push(...rows);
  }

  const sources = new Set<'bridge' | 'trestle' | 'idx_broker' | 'cache'>();
  for (const row of liveResults) sources.add(row.source);

  if (liveResults.length > 0) {
    const listings = dedupeListings(liveResults).slice(0, params.limit ?? 5);
    return { markets, listings, sources: [...sources] };
  }

  const cached = await searchCachedListings(db, params, markets);
  if (cached.length > 0) {
    sources.add('cache');
    return {
      markets,
      listings: dedupeListings(cached).slice(0, params.limit ?? 5),
      sources: [...sources],
    };
  }

  const hasIdxIntegration = integrations.some((row) => integrationProvider(row) === 'idx_broker');
  if (!hasIdxIntegration && idxBrokerCredentialsAvailable()) {
    const idxMarket = resolveMlsMarket();
    const idxRows = await fetchLiveListingsForMarket(idxMarket, params);
    if (idxRows.length > 0) {
      for (const row of idxRows) sources.add(row.source);
      return {
        markets: [idxMarket, ...markets],
        listings: dedupeListings(idxRows).slice(0, params.limit ?? 5),
        sources: [...sources],
      };
    }
  }

  for (const market of markets) {
    if (market.provider === 'bridge' && bridgeCredentialsAvailable()) {
      const rows = await fetchBridgeListings(market, params);
      if (rows.length) {
        for (const row of rows) sources.add(row.source);
        return {
          markets,
          listings: dedupeListings(rows).slice(0, params.limit ?? 5),
          sources: [...sources],
        };
      }
    }
    if (market.provider === 'trestle' && trestleCredentialsAvailable()) {
      const rows = await fetchTrestleListings(market, params);
      if (rows.length) {
        for (const row of rows) sources.add(row.source);
        return {
          markets,
          listings: dedupeListings(rows).slice(0, params.limit ?? 5),
          sources: [...sources],
        };
      }
    }
  }

  return { markets, listings: [], sources: [...sources] };
}

export async function searchListingsForIntegration(
  db: DbClient,
  integration: MlsIntegrationRow,
  tenantId: string,
  limit = 25
): Promise<ListingResult[]> {
  const marketId = integrationMarketId(integration);
  const market = resolveMlsMarket(marketId);
  const live = await fetchLiveListingsForMarket(
    market,
    { tenantId, market: marketId, limit, skipGeoFilter: true },
    integration
  );

  if (live.length > 0) return live;

  return searchCachedListings(db, { tenantId, market: marketId, limit }, [market]);
}
