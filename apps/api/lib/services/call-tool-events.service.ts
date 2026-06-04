import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@voxori/database';

type Db = SupabaseClient<Database>;

export type ToolEventStatus = 'success' | 'error';

export interface RecordToolEventInput {
  callId?: string | null;
  tenantId: string;
  agentId: string;
  toolName: string;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  durationMs?: number | null;
  idempotencyKey?: string | null;
  status?: ToolEventStatus;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function normalizeToolName(toolName: string): string {
  return toolName
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function stableJson(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(',')}}`;
}

export function buildToolIdempotencyKey(params: {
  callId: string;
  toolName: string;
  input?: Record<string, unknown> | null;
  explicitKey?: string | null;
}): string {
  if (params.explicitKey?.trim()) return params.explicitKey.trim();
  const inputHash = createHash('sha256')
    .update(stableJson(params.input ?? {}))
    .digest('hex')
    .slice(0, 32);
  return createHash('sha256')
    .update(`${params.callId}:${normalizeToolName(params.toolName)}:${inputHash}`)
    .digest('hex');
}

export function extractCallIdFromBody(body: Record<string, unknown>): string | null {
  const message = body.message as Record<string, unknown> | undefined;
  const call = message?.call as Record<string, unknown> | undefined;
  const raw =
    body.callId ??
    body.call_id ??
    call?.id ??
    message?.callId ??
    message?.call_id;

  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

export function extractVapiCallIdFromRequest(
  request: NextRequest,
  body?: Record<string, unknown> | null
): string | null {
  const headerCandidates = [
    request.headers.get('x-vapi-call-id'),
    request.headers.get('x-call-id'),
    request.headers.get('x-voxori-call-id'),
  ];
  for (const value of headerCandidates) {
    if (value?.trim()) return value.trim();
  }
  if (body) return extractCallIdFromBody(body);
  return null;
}

/** Resolve internal call UUID from Vapi id or active in-progress call for agent. */
export async function resolveInternalCallId(
  db: Db,
  params: { tenantId: string; agentId: string; externalCallId?: string | null }
): Promise<string | null> {
  const { tenantId, agentId, externalCallId } = params;

  if (externalCallId) {
    if (isUuid(externalCallId)) {
      const { data } = await db
        .from('calls')
        .select('id')
        .eq('id', externalCallId)
        .eq('tenant_id', tenantId)
        .eq('agent_id', agentId)
        .maybeSingle();
      if (data?.id) return data.id;
    }

    const { data: byVapi } = await db
      .from('calls')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('agent_id', agentId)
      .eq('vapi_call_id', externalCallId)
      .maybeSingle();
    if (byVapi?.id) return byVapi.id;
  }

  const { data: activeCall } = await db
    .from('calls')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .eq('status', 'in_progress')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeCall?.id) return activeCall.id;

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: recentCall } = await db
    .from('calls')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .gte('started_at', twoHoursAgo)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return recentCall?.id ?? null;
}

export async function resolveCallIdFromToolRequest(
  db: Db,
  request: NextRequest,
  tenantId: string,
  agentId: string,
  body?: Record<string, unknown> | null
): Promise<string | null> {
  const externalCallId = extractVapiCallIdFromRequest(request, body);
  return resolveInternalCallId(db, { tenantId, agentId, externalCallId });
}

export async function recordToolEvent(
  db: Db,
  params: RecordToolEventInput
): Promise<{ recorded: boolean; callId: string | null; duplicate?: boolean }> {
  const internalCallId = await resolveInternalCallId(db, {
    tenantId: params.tenantId,
    agentId: params.agentId,
    externalCallId: params.callId,
  });

  if (!internalCallId) {
    console.warn('[call-tool-events] skipped — no callId resolved', {
      toolName: params.toolName,
      tenantId: params.tenantId,
      agentId: params.agentId,
      externalCallId: params.callId ?? null,
    });
    return { recorded: false, callId: null };
  }

  const toolName = normalizeToolName(params.toolName);
  const idempotencyKey = buildToolIdempotencyKey({
    callId: internalCallId,
    toolName,
    input: params.input,
    explicitKey: params.idempotencyKey,
  });

  const { error } = await db.from('call_tool_events').insert({
    call_id: internalCallId,
    tool_name: toolName,
    input: (params.input ?? null) as Json,
    output: (params.output ?? null) as Json,
    duration_ms: params.durationMs ?? null,
    idempotency_key: idempotencyKey,
    status: params.status ?? 'success',
  });

  if (error) {
    if (error.code === '23505') {
      return { recorded: false, callId: internalCallId, duplicate: true };
    }
    console.error('[call-tool-events] insert failed', {
      toolName,
      callId: internalCallId,
      error: error.message,
    });
    return { recorded: false, callId: internalCallId };
  }

  return { recorded: true, callId: internalCallId };
}

/** @deprecated Use recordToolEvent */
export async function recordCallToolEvent(
  db: Db,
  params: Omit<RecordToolEventInput, 'idempotencyKey' | 'status'> & {
    idempotencyKey?: string | null;
    status?: ToolEventStatus;
  }
): Promise<{ recorded: boolean; callId: string | null }> {
  return recordToolEvent(db, params);
}
