import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
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

  const body = await request.json() as SearchListingsParams;
  const { min_bedrooms, max_price, min_sqft } = body;

  const db = createServiceRoleClient();

  let query = db
    .from('listings')
    .select('id, address, price, bedrooms, bathrooms, sqft, status, mls_id')
    .eq('tenant_id', auth.tenantId)
    .eq('status', 'active')
    .limit(5);

  if (min_bedrooms) query = query.gte('bedrooms', min_bedrooms);
  if (max_price) query = query.lte('price', max_price);
  if (min_sqft) query = query.gte('sqft', min_sqft);

  const { data: listings } = await query;

  return NextResponse.json({
    listings: listings ?? [],
    message: listings?.length
      ? `Found ${listings.length} matching listing(s).`
      : 'No listings match your criteria.',
  });
}
