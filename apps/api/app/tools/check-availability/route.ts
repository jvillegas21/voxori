import { NextRequest, NextResponse } from 'next/server';
import { verifyToolSecret } from '../_auth';

interface CheckAvailabilityParams {
  date: string;
  time: string;
  duration_minutes?: number;
}

export async function POST(request: NextRequest) {
  const auth = await verifyToolSecret(request);
  if (auth instanceof NextResponse) return auth;

  const params = await request.json() as CheckAvailabilityParams;

  // Phase 1: Query Google Calendar integration if connected.
  // For now, return unavailable with a message.
  console.log('[tool] check-availability called', { agentId: auth.agentId, params });

  return NextResponse.json({
    available: false,
    message: 'Calendar integration is not yet configured. Please call back to schedule.',
  });
}
