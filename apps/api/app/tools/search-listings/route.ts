import { NextRequest, NextResponse } from 'next/server';
import { verifyToolSecret } from '../_auth';

interface SearchListingsParams {
  min_bedrooms?: number;
  max_price?: number;
  zip_codes?: string[];
  min_sqft?: number;
}

export async function POST(request: NextRequest) {
  const auth = await verifyToolSecret(request);
  if (auth instanceof NextResponse) return auth;

  const params = await request.json() as SearchListingsParams;

  // Phase 3: Query cached listings from DB filtered by agent's MLS integration.
  // For Phase 1, return a placeholder response so Vapi can handle gracefully.
  console.log('[tool] search-listings called', { agentId: auth.agentId, params });

  return NextResponse.json({
    listings: [],
    message: 'Listing search is not yet configured. Please contact the agent directly.',
  });
}
