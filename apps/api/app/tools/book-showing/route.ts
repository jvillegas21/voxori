import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
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

  const body = await request.json() as BookShowingParams;
  const { date, time, listing_address, caller_name, caller_phone } = body;

  const db = createServiceRoleClient();
  const { error } = await db.from('bookings').insert({
    tenant_id: auth.tenantId,
    agent_id: auth.agentId,
    contact_name: caller_name,
    contact_phone: caller_phone,
    showing_address: listing_address,
    scheduled_at: new Date(`${date}T${time}`).toISOString(),
    status: 'pending',
  });

  if (error) {
    return NextResponse.json({ success: false, message: 'Failed to book showing. Please try again.' });
  }

  return NextResponse.json({
    success: true,
    message: `Showing booked for ${date} at ${time} at ${listing_address}. A confirmation will be sent to ${caller_phone}.`,
  });
}
