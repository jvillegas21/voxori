import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import { verifyToolSecret } from '../../app/tools/_auth';
import {
  buildToolIdempotencyKey,
  extractCallIdFromBody,
  extractVapiCallIdFromRequest,
  recordToolEvent,
  resolveCallIdFromToolRequest,
  type ToolEventStatus,
} from './call-tool-events.service';

export type ToolAuth = { agentId: string; tenantId: string };

export async function authenticateToolRequest(
  request: NextRequest
): Promise<ToolAuth | NextResponse> {
  return verifyToolSecret(request);
}

export async function parseToolJsonBody<T>(
  request: NextRequest
): Promise<{ body: T; callId: string | null } | NextResponse> {
  try {
    const body = (await request.json()) as T;
    return {
      body,
      callId: extractCallIdFromBody(body as Record<string, unknown>),
    };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}

export async function resolveToolCallId(
  request: NextRequest,
  auth: ToolAuth,
  body?: Record<string, unknown> | null
): Promise<string | null> {
  const db = createServiceRoleClient();
  return resolveCallIdFromToolRequest(db, request, auth.tenantId, auth.agentId, body);
}

export async function logToolExecution(params: {
  request: NextRequest;
  auth: ToolAuth;
  toolName: string;
  callId: string | null;
  body?: Record<string, unknown> | null;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  durationMs: number;
  status?: ToolEventStatus;
  idempotencyKey?: string | null;
}): Promise<void> {
  const db = createServiceRoleClient();
  const externalCallId =
    params.callId ??
    extractVapiCallIdFromRequest(params.request, params.body ?? params.input);

  const resolvedCallId = await resolveCallIdFromToolRequest(
    db,
    params.request,
    params.auth.tenantId,
    params.auth.agentId,
    params.body ?? params.input
  );

  const idempotencyKey =
    params.idempotencyKey ??
    (resolvedCallId
      ? buildToolIdempotencyKey({
          callId: resolvedCallId,
          toolName: params.toolName,
          input: params.input,
        })
      : null);

  await recordToolEvent(db, {
    tenantId: params.auth.tenantId,
    agentId: params.auth.agentId,
    callId: externalCallId,
    toolName: params.toolName,
    input: params.input,
    output: params.output,
    durationMs: params.durationMs,
    idempotencyKey,
    status: params.status ?? (params.output.success === false ? 'error' : 'success'),
  });
}
