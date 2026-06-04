import type { MlsMarketConfig } from '@voxori/shared/constants';
import type { ListingResult, ListingSearchParams } from './types';

/** Per-tenant or platform IDX Broker credentials (encrypted in integrations.credentials). */
export interface IdxBrokerCredentialFields {
  api_key: string;
  account_id?: string;
}

const DEFAULT_BASE_URL = 'https://api.idxbroker.com';

/** Documented: GET /clients/featured — agent/account featured listings. */
export const IDX_BROKER_FEATURED_PATH = '/clients/featured';

/**
 * Documented search-style query on client listings (IDX custom form / saved-link params).
 * If this method is unavailable on the account tier, we fall back to featured + client-side filters.
 */
export const IDX_BROKER_LISTINGS_SEARCH_PATH = '/clients/listings';

export function getIdxBrokerBaseUrl(): string {
  return process.env.IDX_BROKER_API_BASE_URL ?? DEFAULT_BASE_URL;
}

function getPlatformIdxApiKey(): string | undefined {
  return (
    process.env.IDX_BROKER_API_KEY?.trim() ||
    process.env.IDX_BROKER_DEFAULT_API_KEY?.trim()
  );
}

function getTenantIdxApiKey(tenantCreds?: Record<string, string> | null): string | undefined {
  return tenantCreds?.api_key?.trim() || tenantCreds?.accesskey?.trim();
}

/** IDX access keys are alphanumeric, typically 20+ characters. */
export function isValidIdxAccessKey(key: string): boolean {
  return key.length >= 20 && /^[a-zA-Z0-9]+$/.test(key);
}

/** Use platform env key when tenant is in platform mode or has no valid per-tenant key. */
export function shouldUsePlatformIdxCredentials(
  tenantCreds?: Record<string, string> | null
): boolean {
  if (tenantCreds?.mode === 'platform') return true;
  const tenantKey = getTenantIdxApiKey(tenantCreds);
  if (!tenantKey) return true;
  return !isValidIdxAccessKey(tenantKey) && Boolean(getPlatformIdxApiKey());
}

function resolveIdxAccountId(
  tenantCreds?: Record<string, string> | null
): string | undefined {
  return (
    tenantCreds?.account_id?.trim() ||
    tenantCreds?.client_id?.trim() ||
    process.env.IDX_BROKER_ACCOUNT_ID?.trim()
  );
}

export function resolveIdxBrokerCredentials(
  tenantCreds?: Record<string, string> | null
): IdxBrokerCredentialFields | null {
  const platformKey = getPlatformIdxApiKey();
  const accountId = resolveIdxAccountId(tenantCreds);

  if (shouldUsePlatformIdxCredentials(tenantCreds) && platformKey) {
    return {
      api_key: platformKey,
      ...(accountId ? { account_id: accountId } : {}),
    };
  }

  const tenantKey = getTenantIdxApiKey(tenantCreds);
  if (tenantKey) {
    return {
      api_key: tenantKey,
      ...(accountId ? { account_id: accountId } : {}),
    };
  }

  if (platformKey) {
    return {
      api_key: platformKey,
      ...(accountId ? { account_id: accountId } : {}),
    };
  }

  return null;
}

export function idxBrokerCredentialsAvailable(
  tenantCreds?: Record<string, string> | null
): boolean {
  return resolveIdxBrokerCredentials(tenantCreds) !== null;
}

function buildIdxHeaders(creds: IdxBrokerCredentialFields): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    accesskey: creds.api_key,
    outputtype: 'json',
    apiversion: process.env.IDX_BROKER_API_VERSION ?? '1.8.0',
  };

  const ancillaryKey = process.env.IDX_BROKER_PARTNER_API_KEY?.trim();
  if (ancillaryKey) {
    headers.ancillarykey = ancillaryKey;
  }

  return headers;
}

export function buildIdxSearchQuery(
  market: MlsMarketConfig,
  params: ListingSearchParams
): string {
  const parts: string[] = [];

  if (market.idxMlsId) {
    parts.push(`idxID=${encodeURIComponent(market.idxMlsId)}`);
  }

  if (params.minBedrooms) {
    parts.push(`bd=${params.minBedrooms}`);
    parts.push(`amin_bedrooms=${params.minBedrooms}`);
  }

  if (params.minBathrooms) {
    parts.push(`tb=${params.minBathrooms}`);
    parts.push(`amin_bathrooms=${params.minBathrooms}`);
  }

  if (params.minPrice) {
    parts.push(`lp=${params.minPrice}`);
    parts.push(`amin_listingPrice=${params.minPrice}`);
  }

  if (params.maxPrice) {
    parts.push(`hp=${params.maxPrice}`);
    parts.push(`amax_listingPrice=${params.maxPrice}`);
  }

  if (params.minSqft) {
    parts.push(`amin_sqft=${params.minSqft}`);
  }

  const zipCodes = params.zipCodes?.length ? params.zipCodes : [...market.defaultZipCodes];
  if (zipCodes.length === 1) {
    parts.push(`zipcode=${encodeURIComponent(zipCodes[0]!)}`);
  } else if (zipCodes.length > 1) {
    for (const zip of zipCodes.slice(0, 5)) {
      parts.push(`aw_zipcode[]=${encodeURIComponent(zip)}`);
    }
  }

  parts.push('a_status[]=active');
  return parts.join('&');
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveIdxAccountSubdomain(
  tenantCreds?: Record<string, string> | null
): string | undefined {
  return (
    tenantCreds?.account_subdomain?.trim() ||
    tenantCreds?.subdomain?.trim() ||
    process.env.IDX_BROKER_ACCOUNT_SUBDOMAIN?.trim()
  );
}

/**
 * IDX listing detail URLs (see docs/VAPI_IDX_BUYER_FLOW.md §14):
 * 1. Row-level `detailsURL`, `detailsUrl`, or `first` on the listing object
 * 2. Response-level `first` — paginated search URL for the first result only
 * 3. Construct: https://{subdomain}.idxbroker.com/idx/details/listing/{idxID}/{listingID}
 */
function resolveIdxDetailUrl(
  row: Record<string, unknown>,
  options: { responseFirst?: string; accountSubdomain?: string }
): string | undefined {
  for (const key of ['detailsURL', 'detailsUrl', 'fullDetailsURL', 'url', 'first']) {
    const value = row[key];
    if (typeof value === 'string' && value.startsWith('http')) {
      return value;
    }
  }

  if (options.responseFirst) {
    return options.responseFirst;
  }

  const listingId = String(row.listingID ?? row.listingId ?? '').trim();
  const idxId = String(row.idxID ?? '').trim();
  const subdomain = options.accountSubdomain;
  if (!subdomain || !listingId) return undefined;

  const path = idxId
    ? `/idx/details/listing/${encodeURIComponent(idxId)}/${encodeURIComponent(listingId)}`
    : `/idx/details/listing/${encodeURIComponent(listingId)}`;
  return `https://${subdomain}.idxbroker.com${path}`;
}

function extractResponseFirst(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const first = (payload as Record<string, unknown>).first;
  return typeof first === 'string' && first.startsWith('http') ? first : undefined;
}

function normalizeIdxListing(
  row: Record<string, unknown>,
  market: MlsMarketConfig,
  options: { responseFirst?: string; accountSubdomain?: string } = {}
): ListingResult | null {
  const listingId = String(
    row.listingID ?? row.listingId ?? row.mlsNumber ?? row.id ?? ''
  ).trim();
  const idxId = String(row.idxID ?? '').trim();
  const mlsId =
    idxId && listingId ? `${idxId}-${listingId}` : listingId || idxId;
  if (!mlsId) return null;

  const address = String(
    row.address ??
      row.displayAddress ??
      [row.streetNumber, row.streetName, row.cityName, row.state, row.postalcode]
        .filter(Boolean)
        .join(' ')
        .trim() ??
      'Unknown address'
  );

  const statusRaw = String(row.idxStatus ?? row.propStatus ?? row.status ?? 'active').toLowerCase();

  const zipcode = String(row.zipcode ?? row.postalcode ?? '').trim() || null;
  const detailUrl = resolveIdxDetailUrl(row, options);

  return {
    id: mlsId,
    mls_id: mlsId,
    address,
    zipcode,
    price: parseNumber(row.listingPrice ?? row.price ?? row.lp),
    bedrooms: parseNumber(row.bedrooms ?? row.minBed ?? row.bd),
    bathrooms: parseNumber(row.totalBaths ?? row.fullBaths ?? row.tb),
    sqft: parseNumber(row.sqFt ?? row.sqft),
    status: statusRaw.includes('active') ? 'active' : statusRaw || 'active',
    originating_system_name: market.originatingSystemName,
    market_id: market.id,
    source: 'idx_broker' as const,
    ...(detailUrl ? { detailUrl } : {}),
  };
}

function normalizeIdxListingsFromPayload(
  payload: unknown,
  market: MlsMarketConfig,
  creds: IdxBrokerCredentialFields
): ListingResult[] {
  const responseFirst = extractResponseFirst(payload);
  const accountSubdomain = resolveIdxAccountSubdomain(creds);
  return extractListingRows(payload)
    .map((row, index) =>
      normalizeIdxListing(row, market, {
        responseFirst: index === 0 ? responseFirst : undefined,
        accountSubdomain,
      })
    )
    .filter((row): row is ListingResult => row !== null);
}

function extractListingRows(payload: unknown): Record<string, unknown>[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null);
  }
  if (typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  for (const key of ['data', 'listings', 'results', 'properties', 'featured']) {
    const nested = record[key];
    if (Array.isArray(nested)) {
      return nested.filter(
        (row): row is Record<string, unknown> => typeof row === 'object' && row !== null
      );
    }
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const mapValues = Object.values(nested as Record<string, unknown>);
      if (
        mapValues.length > 0 &&
        mapValues.every((value) => typeof value === 'object' && value !== null)
      ) {
        return mapValues.filter(
          (row): row is Record<string, unknown> => typeof row === 'object' && row !== null
        );
      }
    }
  }

  const values = Object.values(record);
  if (values.every((v) => typeof v === 'object' && v !== null)) {
    return values.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null);
  }

  return [];
}

function applyClientFilters(
  listings: ListingResult[],
  params: ListingSearchParams,
  market: MlsMarketConfig
): ListingResult[] {
  const zipCodes = params.zipCodes?.length ? params.zipCodes : [...market.defaultZipCodes];
  const zipSet = new Set(zipCodes);

  return listings.filter((listing) => {
    if (params.minBedrooms && (listing.bedrooms ?? 0) < params.minBedrooms) return false;
    if (params.minBathrooms && (listing.bathrooms ?? 0) < params.minBathrooms) return false;
    if (params.minPrice && listing.price !== null && listing.price < params.minPrice) return false;
    if (params.maxPrice && listing.price !== null && listing.price > params.maxPrice) return false;
    if (params.minSqft && (listing.sqft ?? 0) < params.minSqft) return false;
    if (zipSet.size > 0) {
      const listingZip = listing.zipcode?.trim();
      const match =
        (listingZip && zipSet.has(listingZip)) ||
        [...zipSet].some((zip) => listing.address.includes(zip));
      if (!match) return false;
    }
    return listing.status === 'active';
  });
}

async function idxBrokerGet(
  path: string,
  creds: IdxBrokerCredentialFields,
  query?: string
): Promise<unknown | null> {
  const url = new URL(path.replace(/^\//, ''), `${getIdxBrokerBaseUrl()}/`);
  if (query) url.search = query.startsWith('?') ? query.slice(1) : query;

  const response = await fetch(url.toString(), {
    headers: buildIdxHeaders(creds),
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    console.warn('[mls-idx-broker] API error', path, response.status, await response.text());
    return null;
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

async function fetchIdxBrokerFeatured(
  market: MlsMarketConfig,
  creds: IdxBrokerCredentialFields
): Promise<ListingResult[]> {
  const payload = await idxBrokerGet(IDX_BROKER_FEATURED_PATH, creds);
  if (!payload) return [];

  return normalizeIdxListingsFromPayload(payload, market, creds);
}

async function fetchIdxBrokerSearch(
  market: MlsMarketConfig,
  params: ListingSearchParams,
  creds: IdxBrokerCredentialFields
): Promise<ListingResult[]> {
  const query = buildIdxSearchQuery(market, params);
  const payload = await idxBrokerGet(IDX_BROKER_LISTINGS_SEARCH_PATH, creds, query);
  if (!payload) return [];

  return normalizeIdxListingsFromPayload(payload, market, creds);
}

export async function fetchIdxBrokerListings(
  market: MlsMarketConfig,
  params: ListingSearchParams,
  creds: IdxBrokerCredentialFields
): Promise<ListingResult[]> {
  const limit = params.limit ?? 5;
  const hasSearchFilters = Boolean(
    params.minBedrooms ||
      params.minBathrooms ||
      params.minPrice ||
      params.maxPrice ||
      params.minSqft ||
      params.zipCodes?.length
  );

  let listings: ListingResult[] = [];

  if (hasSearchFilters) {
    listings = await fetchIdxBrokerSearch(market, params, creds);
  }

  if (listings.length === 0) {
    listings = await fetchIdxBrokerFeatured(market, creds);
  }

  if (hasSearchFilters || !params.skipGeoFilter) {
    listings = applyClientFilters(listings, params, market);
  } else {
    listings = listings.filter((listing) => listing.status === 'active');
  }

  return listings.slice(0, limit);
}
