import { NextRequest, NextResponse } from 'next/server';
import { verifyToolSecret } from '../_auth';

interface BookShowingParams {
  date: string;
  time: string;
  listing_address: string;
  caller_name: string;
  caller_phone: string;
  duration_minutes?: number;
}

export async function POST(request: NextRequest) {
  const auth = await verifyToolSecret(request);
  if (auth instanceof NextResponse) return auth;

  const params = await request.json() as BookShowingParams;

  console.log('[tool] book-showing called', { agentId: auth.agentId, params });

  return NextResponse.json({
    success: false,
    message: 'Calendar booking is not yet configured. A confirmation will be sent manually.',
  });
}
