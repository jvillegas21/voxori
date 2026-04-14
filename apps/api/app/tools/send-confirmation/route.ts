import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { verifyToolSecret } from '../_auth';

interface SendConfirmationParams {
  to_phone: string;
  message: string;
}

export async function POST(request: NextRequest) {
  const auth = await verifyToolSecret(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json() as SendConfirmationParams;
  const { to_phone, message } = body;

  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );

  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: to_phone,
    });

    return NextResponse.json({ success: true, message: 'Confirmation sent.' });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to send confirmation.' });
  }
}
