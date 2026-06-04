import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import {
  authenticateToolRequest,
  logToolExecution,
  parseToolJsonBody,
  resolveToolCallId,
} from '../../../lib/services/tool-route-helper';

interface RecordConsentParams {
  consent_given: boolean;
  consent_state?: string;
  callId?: string;
  call_id?: string;
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  const auth = await authenticateToolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseToolJsonBody<RecordConsentParams>(request);
  if (parsed instanceof NextResponse) return parsed;
  const { body, callId } = parsed;

  if (typeof body.consent_given !== 'boolean') {
    return NextResponse.json({ error: 'consent_given must be a boolean' }, { status: 400 });
  }

  const db = createServiceRoleClient();
  const internalCallId = await resolveToolCallId(
    request,
    auth,
    body as unknown as Record<string, unknown>
  );

  if (!internalCallId) {
    const failure = {
      recorded: false,
      message: 'Could not resolve active call for consent update.',
    };
    void logToolExecution({
      request,
      auth,
      toolName: 'record-consent',
      callId,
      body: body as unknown as Record<string, unknown>,
      input: body as unknown as Record<string, unknown>,
      output: failure,
      durationMs: Date.now() - started,
      status: 'error',
    });
    return NextResponse.json(failure, { status: 404 });
  }

  const updatePayload: { consent_given: boolean; consent_state?: string | null } = {
    consent_given: body.consent_given,
  };
  if (body.consent_state !== undefined) {
    updatePayload.consent_state = body.consent_state?.trim() || null;
  }

  const { error: updateError } = await db
    .from('calls')
    .update(updatePayload)
    .eq('id', internalCallId)
    .eq('tenant_id', auth.tenantId)
    .eq('agent_id', auth.agentId);

  if (updateError) {
    const failure = {
      recorded: false,
      message: 'Failed to update call consent.',
    };
    void logToolExecution({
      request,
      auth,
      toolName: 'record-consent',
      callId,
      body: body as unknown as Record<string, unknown>,
      input: body as unknown as Record<string, unknown>,
      output: failure,
      durationMs: Date.now() - started,
      status: 'error',
    });
    return NextResponse.json(failure, { status: 500 });
  }

  const response = {
    recorded: true,
    call_id: internalCallId,
    consent_given: body.consent_given,
    consent_state: updatePayload.consent_state ?? null,
    message: body.consent_given
      ? 'SMS consent recorded. You may send listing updates after the call.'
      : 'Consent declined. Do not send SMS listing updates.',
  };

  void logToolExecution({
    request,
    auth,
    toolName: 'record-consent',
    callId,
    body: body as unknown as Record<string, unknown>,
    input: body as unknown as Record<string, unknown>,
    output: response,
    durationMs: Date.now() - started,
  });

  return NextResponse.json(response);
}
