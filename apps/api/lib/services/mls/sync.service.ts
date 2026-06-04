import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@voxori/database/types';
import { resolveMlsMarket } from '@voxori/shared/constants';
import { bridgeCredentialsAvailable } from './bridge.provider';
import { idxBrokerCredentialsAvailable } from './idx-broker.provider';
import { trestleCredentialsAvailable } from './trestle.provider';
import { searchListingsForIntegration } from './search.service';
import { integrationMarketId, type MlsIntegrationRow } from './types';

type DbClient = SupabaseClient<Database>;

export function anyMlsProviderConfigured(): boolean {
  return (
    idxBrokerCredentialsAvailable() ||
    bridgeCredentialsAvailable() ||
    trestleCredentialsAvailable()
  );
}

export async function syncIntegrationListings(
  db: DbClient,
  integration: MlsIntegrationRow & { tenant_id: string }
): Promise<number> {
  const marketId = integrationMarketId(integration);
  const market = resolveMlsMarket(marketId);
  const listings = await searchListingsForIntegration(
    db,
    integration,
    integration.tenant_id,
    25
  );

  if (listings.length === 0) return 0;

  const rows = listings.map((listing) => ({
    tenant_id: integration.tenant_id,
    integration_id: integration.id,
    mls_id: listing.mls_id,
    originating_system_name: listing.originating_system_name || market.originatingSystemName,
    address: listing.address,
    price: listing.price,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    sqft: listing.sqft,
    status: listing.status,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await db.from('listings').upsert(rows, {
    onConflict: 'tenant_id,originating_system_name,mls_id',
  });

  if (error) {
    console.warn('[mls-sync] upsert failed', market.id, error.message);
    return 0;
  }

  await db
    .from('integrations')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', integration.id);

  return rows.length;
}

export async function syncTenantListings(db: DbClient, tenantId: string): Promise<number> {
  const { data: integrations } = await db
    .from('integrations')
    .select('id, tenant_id, credentials, config, market_id')
    .eq('tenant_id', tenantId)
    .eq('type', 'mls_idx')
    .eq('is_active', true);

  if (!integrations?.length) return 0;

  let total = 0;
  for (const integration of integrations) {
    total += await syncIntegrationListings(
      db,
      integration as MlsIntegrationRow & { tenant_id: string }
    );
  }

  return total;
}

export interface MlsSyncRunResult {
  tenantId: string;
  integrationId: string;
  marketId: string;
  synced: number;
}

export async function syncAllTenantListings(db: DbClient): Promise<MlsSyncRunResult[]> {
  const { data: integrations, error } = await db
    .from('integrations')
    .select('id, tenant_id, credentials, config, market_id')
    .eq('type', 'mls_idx')
    .eq('is_active', true);

  if (error) {
    console.warn('[mls-sync] integration query failed', error.message);
    return [];
  }

  const results: MlsSyncRunResult[] = [];

  for (const integration of integrations ?? []) {
    const synced = await syncIntegrationListings(
      db,
      integration as MlsIntegrationRow & { tenant_id: string }
    );
    results.push({
      tenantId: integration.tenant_id,
      integrationId: integration.id,
      marketId: integrationMarketId(integration as MlsIntegrationRow),
      synced,
    });
  }

  return results;
}
