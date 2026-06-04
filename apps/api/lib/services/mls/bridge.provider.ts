import type { MlsMarketConfig } from '@voxori/shared/constants';
import type { ListingResult, ListingSearchParams } from './types';

function hasBridgeCredentials(): boolean {
  return Boolean(process.env.BRIDGE_SERVER_TOKEN ?? process.env.BRIDGE_API_KEY);
}

function getBridgeBaseUrl(): string {
  return (
    process.env.BRIDGE_API_BASE_URL ??
    'https://api.bridgedataoutput.com/api/v2/OData'
  );
}

export function buildBridgePropertyUrl(market: MlsMarketConfig): string {
  const dataset = market.bridgeMarketId ?? 'abor_ref';
  return `${getBridgeBaseUrl()}/${dataset}/Property`;
}

export async function fetchBridgeListings(
  market: MlsMarketConfig,
  params: ListingSearchParams
): Promise<ListingResult[]> {
  const token = process.env.BRIDGE_SERVER_TOKEN ?? process.env.BRIDGE_API_KEY;
  if (!token || !hasBridgeCredentials()) return [];

  const filters: string[] = ["StandardStatus eq 'Active'"];
  if (params.minBedrooms) filters.push(`BedroomsTotal ge ${params.minBedrooms}`);
  if (params.maxPrice) filters.push(`ListPrice le ${params.maxPrice}`);
  if (params.minSqft) filters.push(`LivingArea ge ${params.minSqft}`);

  const zipCodes = params.zipCodes?.length ? params.zipCodes : [...market.defaultZipCodes];
  if (zipCodes.length) {
    const zipFilter = zipCodes.map((z) => `PostalCode eq '${z}'`).join(' or ');
    filters.push(`(${zipFilter})`);
  }

  const url = new URL(buildBridgePropertyUrl(market));
  url.searchParams.set('$filter', filters.join(' and '));
  url.searchParams.set('$top', String(params.limit ?? 5));
  url.searchParams.set(
    '$select',
    'ListingKey,UnparsedAddress,ListPrice,BedroomsTotal,BathroomsTotalInteger,LivingArea,StandardStatus'
  );
  url.searchParams.set('access_token', token);

  const response = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!response.ok) {
    console.warn('[mls-bridge] Bridge API error', response.status, await response.text());
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
    source: 'bridge' as const,
  }));
}

export function bridgeCredentialsAvailable(): boolean {
  return hasBridgeCredentials();
}
