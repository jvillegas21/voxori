import { NextRequest, NextResponse } from 'next/server';
import { verifyToolSecret } from '../_auth';

interface SendConfirmationParams {
  to_phone: string;
  message: string;
}

export async function POST(request: NextRequest) {
  const auth = await verifyToolSecret(request);
  if (auth instanceof NextResponse) return auth;

  const params = await request.json() as SendConfirmationParams;

  // Phase 1: Send SMS via Twilio.
  // Twilio SDK install + implementation happens when calendar booking is live.
  console.log('[tool] send-confirmation called', { agentId: auth.agentId, to: params.to_phone });

  return NextResponse.json({
    sent: false,
    message: 'SMS confirmation will be sent manually.',
  });
}
