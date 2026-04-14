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

  const body = await request.json() as CheckAvailabilityParams;
  const { date, time, duration_minutes } = body;

  // Phase 2: will query Google Calendar integration
  return NextResponse.json({
    available: true,
    message: `${date} at ${time} is available for a ${duration_minutes ?? 30}-minute appointment. Would you like me to book it?`,
  });
}
