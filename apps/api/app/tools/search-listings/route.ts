import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import {
  authenticateToolRequest,
  logToolExecution,
  parseToolJsonBody,
} from '../../../lib/services/tool-route-helper';
import { resolveZipCodesFromArea } from '../../../lib/services/mls/city-zip-resolver';
import { searchListings } from '../../../lib/services/mls';

interface SearchListingsParams {
  min_bedrooms?: number;
  min_bathrooms?: number;
  min_price?: number;
  max_price?: number;
  zip_codes?: string[];
  area_of_interest?: string;
  min_sqft?: number;
  market?: string;
  callId?: string;
  call_id?: string;
}

function resolveSearchZipCodes(body: SearchListingsParams): string[] | undefined {
  if (body.zip_codes?.length) return body.zip_codes;

  if (body.area_of_interest?.trim()) {
    const fromArea = resolveZipCodesFromArea(body.area_of_interest);
    if (fromArea.length > 0) return fromArea;
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  const auth = await authenticateToolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseToolJsonBody<SearchListingsParams>(request);
  if (parsed instanceof NextResponse) return parsed;
  const { body, callId } = parsed;

  const resolvedZipCodes = resolveSearchZipCodes(body);

  const db = createServiceRoleClient();
  const { markets, listings, sources } = await searchListings(db, {
    tenantId: auth.tenantId,
    minBedrooms: body.min_bedrooms,
    minBathrooms: body.min_bathrooms,
    minPrice: body.min_price,
    maxPrice: body.max_price,
    minSqft: body.min_sqft,
    zipCodes: resolvedZipCodes,
    market: body.market,
    limit: 5,
  });

  const primaryMarket = markets[0]!;
  const zipCodes = resolvedZipCodes?.length ? resolvedZipCodes : [...primaryMarket.defaultZipCodes];
  const marketLabel =
    markets.length === 1
      ? primaryMarket.displayName
      : markets.map((m) => m.displayName).join(' + ');

  const response = {
    markets: markets.map((market) => ({
      id: market.id,
      displayName: market.displayName,
      provider: market.provider,
      originatingSystemName: market.originatingSystemName,
      zipCodes: resolvedZipCodes?.length ? resolvedZipCodes : [...market.defaultZipCodes],
    })),
    listings,
    sources,
    source: sources[0] ?? 'cache',
    message: listings.length
      ? `Found ${listings.length} matching listing(s) across ${marketLabel}.`
      : `No listings match your criteria across ${marketLabel}.`,
  };

  void logToolExecution({
    request,
    auth,
    toolName: 'search-listings',
    callId,
    body: body as unknown as Record<string, unknown>,
    input: body as unknown as Record<string, unknown>,
    output: response,
    durationMs: Date.now() - started,
  });

  return NextResponse.json(response);
}
