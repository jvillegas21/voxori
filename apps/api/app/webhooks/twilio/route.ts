import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from 'twilio';
import { createServiceRoleClient } from '@voxori/database/client';
import type { Json } from '@voxori/database';

/** URL Twilio signed (public https host), not localhost — required behind ngrok / reverse proxies. */
function getTwilioRequestUrl(request: NextRequest): string {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host') ?? '';
  const proto = forwardedProto ?? request.nextUrl.protocol.replace(':', '');
  const pathWithQuery = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  return `${proto}://${host}${pathWithQuery}`;
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const url = getTwilioRequestUrl(request);

  // Parse form-encoded Twilio webhook body
  const body = await request.text();
  const params = Object.fromEntries(new URLSearchParams(body));

  // Validate Twilio signature
  const signature = request.headers.get('x-twilio-signature') ?? '';
  const isValid = validateRequest(authToken, signature, url, params);

  if (!isValid) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const callStatus = params['CallStatus'];
  const callSid = params['CallSid'];

  console.log('[twilio] call status update', { callSid, callStatus });

  const db = createServiceRoleClient();

  // Look up agent by phone number to get tenant context
  const calledNumber = params['Called'] ?? params['To'] ?? '';
  const { data: phoneRecord } = await db
    .from('phone_numbers')
    .select('agent_id, tenant_id')
    .eq('number', calledNumber)
    .maybeSingle();

  // Log to webhook_logs (fire-and-forget)
  void db.from('webhook_logs').insert({
    tenant_id:        phoneRecord?.tenant_id ?? null,
    integration_type: 'twilio',
    event_type:       callStatus ?? 'unknown',
    payload:          params as unknown as Json,
    status:           'processed',
  });

  // Update call record on terminal statuses
  if (callStatus === 'completed' && callSid) {
    await db
      .from('calls')
      .update({ status: 'completed' })
      .eq('twilio_call_sid', callSid)
      .not('status', 'eq', 'completed'); // idempotent
  }
  if ((callStatus === 'no-answer' || callStatus === 'failed') && callSid) {
    await db
      .from('calls')
      .update({ status: callStatus === 'no-answer' ? 'missed' : 'failed' })
      .eq('twilio_call_sid', callSid);
  }

  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}
