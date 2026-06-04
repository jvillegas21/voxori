import { resolveMlsMarket, type MlsMarketConfig } from '@voxori/shared/constants';

export interface ListingSearchParams {
  tenantId: string;
  minBedrooms?: number;
  minBathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  minSqft?: number;
  zipCodes?: string[];
  market?: string;
  limit?: number;
  /** When true, skip default market ZIP scoping (used for MLS cache sync). */
  skipGeoFilter?: boolean;
}

export interface ListingResult {
  id: string;
  address: string;
  zipcode?: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  status: string;
  mls_id: string;
  originating_system_name: string;
  market_id: string;
  source: 'bridge' | 'trestle' | 'idx_broker' | 'cache';
  /** IDX-hosted listing detail page for SMS / voice follow-up links */
  detailUrl?: string;
}

export interface MlsSearchResult {
  markets: MlsMarketConfig[];
  listings: ListingResult[];
  sources: Array<'bridge' | 'trestle' | 'idx_broker' | 'cache'>;
}

export interface MlsIntegrationRow {
  id: string;
  credentials: unknown;
  config: Record<string, unknown> | null;
  market_id: string | null;
}

export function integrationMarketId(row: MlsIntegrationRow): string {
  return (
    row.market_id ??
    row.config?.market_id?.toString() ??
    row.config?.market?.toString() ??
    process.env.MLS_MARKET ??
    'idx_broker_primary'
  );
}

export function integrationProvider(row: MlsIntegrationRow): string {
  const fromConfig = row.config?.provider;
  if (typeof fromConfig === 'string' && fromConfig.length > 0) {
    return fromConfig;
  }
  return resolveMlsMarket(integrationMarketId(row)).provider;
}

export function normalizeAddressKey(address: string): string {
  return address.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function dedupeListings(listings: ListingResult[]): ListingResult[] {
  const seen = new Set<string>();
  const deduped: ListingResult[] = [];

  for (const listing of listings) {
    const key = `${listing.originating_system_name}:${listing.mls_id}`;
    const addressKey = normalizeAddressKey(listing.address);
    if (seen.has(key) || (addressKey && seen.has(`addr:${addressKey}`))) continue;
    seen.add(key);
    if (addressKey) seen.add(`addr:${addressKey}`);
    deduped.push(listing);
  }

  return deduped;
}
