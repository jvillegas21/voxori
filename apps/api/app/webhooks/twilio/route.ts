import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from 'twilio';

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const url = request.url;

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
