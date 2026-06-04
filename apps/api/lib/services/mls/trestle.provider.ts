import type { MlsMarketConfig } from '@voxori/shared/constants';
import type { ListingResult, ListingSearchParams } from './types';

interface TrestleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function hasTrestleCredentials(): boolean {
  return Boolean(process.env.TRESTLE_CLIENT_ID && process.env.TRESTLE_CLIENT_SECRET);
}

function getTrestleBaseUrl(): string {
  return process.env.TRESTLE_API_BASE_URL ?? 'https://api-trestle.corelogic.com/trestle/odata';
}

async function getTrestleAccessToken(): Promise<string | null> {
  if (!hasTrestleCredentials()) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const tokenUrl =
    process.env.TRESTLE_TOKEN_URL ??
    'https://api-trestle.corelogic.com/trestle/oidc/connect/token';

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.TRESTLE_CLIENT_ID!,
    client_secret: process.env.TRESTLE_CLIENT_SECRET!,
    scope: process.env.TRESTLE_SCOPE ?? 'api',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    console.warn('[mls-trestle] token error', response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as TrestleTokenResponse;
  if (!payload.access_token) return null;

  cachedToken = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };

  return payload.access_token;
}

export async function fetchTrestleListings(
  market: MlsMarketConfig,
  params: ListingSearchParams
): Promise<ListingResult[]> {
  const token = await getTrestleAccessToken();
  if (!token) return [];

  const filters: string[] = ["StandardStatus eq 'Active'"];
  if (params.minBedrooms) filters.push(`BedroomsTotal ge ${params.minBedrooms}`);
  if (params.maxPrice) filters.push(`ListPrice le ${params.maxPrice}`);
  if (params.minSqft) filters.push(`LivingArea ge ${params.minSqft}`);

  const zipCodes = params.zipCodes?.length ? params.zipCodes : [...market.defaultZipCodes];
  if (zipCodes.length) {
    const zipFilter = zipCodes.map((z) => `PostalCode eq '${z}'`).join(' or ');
    filters.push(`(${zipFilter})`);
  }

  const url = new URL(`${getTrestleBaseUrl()}/Property`);
  url.searchParams.set('$filter', filters.join(' and '));
  url.searchParams.set('$top', String(params.limit ?? 5));
  url.searchParams.set(
    '$select',
    'ListingKey,UnparsedAddress,ListPrice,BedroomsTotal,BathroomsTotalInteger,LivingArea,StandardStatus'
  );

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    console.warn('[mls-trestle] API error', response.status, await response.text());
    return [];
  }

  const payload = (await response.json()) as {
    value?: Array<Record<string, unknown>>;
  };

  return (payload.value ?? []).map((row) => ({
    id: String(row.ListingKey ?? ''),
    mls_id: String(row.ListingKey ?? ''),
    address: String(row.UnparsedAddress ?? 'Unknown address'),
    price: typeof row.ListPrice === 'number' ? row.ListPrice : null,
    bedrooms: typeof row.BedroomsTotal === 'number' ? row.BedroomsTotal : null,
    bathrooms: typeof row.BathroomsTotalInteger === 'number' ? row.BathroomsTotalInteger : null,
    sqft: typeof row.LivingArea === 'number' ? row.LivingArea : null,
    status: 'active',
    originating_system_name: market.originatingSystemName,
    market_id: market.id,
    source: 'trestle' as const,
  }));
}

export function trestleCredentialsAvailable(): boolean {
  return hasTrestleCredentials();
}
