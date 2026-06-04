import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import {
  authenticateToolRequest,
  logToolExecution,
  parseToolJsonBody,
} from '../../../lib/services/tool-route-helper';
import { createServiceRoleClient } from '@voxori/database/client';
import { resolveTenantSmsFromNumber } from '../../../lib/services/tenant-sms.service';

interface SendConfirmationParams {
  to_phone: string;
  message: string;
  callId?: string;
  call_id?: string;
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  const auth = await authenticateToolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseToolJsonBody<SendConfirmationParams>(request);
  if (parsed instanceof NextResponse) return parsed;
  const { body, callId } = parsed;
  const { to_phone, message } = body;

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    const devResponse = {
      success: false,
      message: 'SMS confirmation is not configured on this server.',
    };
    console.log('[send-confirmation] dev skip — Twilio not configured', {
      to: to_phone,
      preview: message.slice(0, 80),
    });
    void logToolExecution({
      request,
      auth,
      toolName: 'send-confirmation',
      callId,
      body: body as unknown as Record<string, unknown>,
      input: body as unknown as Record<string, unknown>,
      output: devResponse,
      durationMs: Date.now() - started,
      status: 'error',
    });
    return NextResponse.json(devResponse);
  }

  const db = createServiceRoleClient();
  const fromNumber = await resolveTenantSmsFromNumber(db, auth.tenantId);

  if (!fromNumber) {
    const devResponse = {
      success: false,
      message: 'No outbound SMS number configured for this workspace.',
    };
    void logToolExecution({
      request,
      auth,
      toolName: 'send-confirmation',
      callId,
      body: body as unknown as Record<string, unknown>,
      input: body as unknown as Record<string, unknown>,
      output: devResponse,
      durationMs: Date.now() - started,
      status: 'error',
    });
    return NextResponse.json(devResponse);
  }

  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  );

  try {
    await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: to_phone,
    });

    const response = { success: true, message: 'Confirmation sent.' };
    void logToolExecution({
      request,
      auth,
      toolName: 'send-confirmation',
      callId,
      body: body as unknown as Record<string, unknown>,
      input: body as unknown as Record<string, unknown>,
      output: response,
      durationMs: Date.now() - started,
    });
    return NextResponse.json(response);
  } catch {
    const failure = { success: false, message: 'Failed to send confirmation.' };
    void logToolExecution({
      request,
      auth,
      toolName: 'send-confirmation',
      callId,
      body: body as unknown as Record<string, unknown>,
      input: body as unknown as Record<string, unknown>,
      output: failure,
      durationMs: Date.now() - started,
      status: 'error',
    });
    return NextResponse.json(failure);
  }
}
