import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from 'twilio';

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

  // Phase 1: log status updates. Phase 2 will update call records here.
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}
