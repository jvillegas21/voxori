import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@voxori/database';

type Db = SupabaseClient<Database>;

interface VapiCallPayload {
  id: string;
  assistantId: string;
  customer?: { number: string };
  startedAt?: string;
  endedAt?: string;
}

interface VapiArtifact {
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  durationSeconds?: number;
}

export interface VapiCallContext {
  eventType: string;
  callId: string | null;
  assistantId: string | null;
}

async function findAgentByAssistantId(db: Db, assistantId: string) {
  const { data } = await db
    .from('agents')
    .select('id, tenant_id')
    .eq('config->>vapi_assistant_id', assistantId)
    .single();
  return data;
}

async function logWebhook(
  db: Db,
  params: {
    tenantId: string | null;
    eventType: string;
    payload: unknown;
    status?: string;
    errorMessage?: string | null;
  }
): Promise<void> {
  void db.from('webhook_logs').insert({
    tenant_id: params.tenantId,
    integration_type: 'vapi',
    event_type: params.eventType,
    payload: params.payload as Json,
    status: params.status ?? 'processed',
    error_message: params.errorMessage ?? null,
  });
}

export async function handleCallStarted(
  db: Db,
  call: VapiCallPayload,
  context: VapiCallContext
): Promise<void> {
  const agent = await findAgentByAssistantId(db, call.assistantId);
  if (!agent) {
    console.warn('[vapi] call-started: no agent for assistant', context);
    await logWebhook(db, {
      tenantId: null,
      eventType: 'call-started',
      payload: call,
    });
    return;
  }

  const { data: existing } = await db
    .from('calls')
    .select('id')
    .eq('vapi_call_id', call.id)
    .maybeSingle();

  if (existing) {
    console.log('[vapi] duplicate call-started ignored', {
      ...context,
      tenantId: agent.tenant_id,
      existingCallId: existing.id,
    });
    await logWebhook(db, {
      tenantId: agent.tenant_id,
      eventType: 'call-started',
      payload: call,
    });
    return;
  }

  await db.from('calls').insert({
    agent_id: agent.id,
    tenant_id: agent.tenant_id,
    vapi_call_id: call.id,
    caller_number: call.customer?.number ?? null,
    status: 'in_progress',
    started_at: call.startedAt ?? new Date().toISOString(),
    ended_at: null,
  });

  console.log('[vapi] call-started persisted', {
    ...context,
    tenantId: agent.tenant_id,
    agentId: agent.id,
  });

  await logWebhook(db, {
    tenantId: agent.tenant_id,
    eventType: 'call-started',
    payload: call,
  });
}

export async function handleCallEnded(
  db: Db,
  call: VapiCallPayload,
  artifact: VapiArtifact | undefined,
  context: VapiCallContext
): Promise<{ callId: string | null; duplicate: boolean }> {
  const agent = await findAgentByAssistantId(db, call.assistantId);
  if (!agent) {
    console.warn('[vapi] call-ended: no agent for assistant', context);
    await logWebhook(db, {
      tenantId: null,
      eventType: 'call-ended',
      payload: { call, artifact },
    });
    return { callId: null, duplicate: false };
  }

  const startedAt = call.startedAt ?? new Date().toISOString();
  const endedAt = call.endedAt ?? new Date().toISOString();
  const callerNumber = call.customer?.number ?? null;
  const callDurationSeconds = artifact?.durationSeconds ?? null;

  const updatePayload = {
    vapi_call_id: call.id,
    caller_number: callerNumber,
    duration_seconds: callDurationSeconds,
    status: 'completed' as const,
    recording_url: artifact?.recordingUrl ?? null,
    transcript: artifact?.transcript ?? null,
    summary: artifact?.summary ?? null,
    started_at: startedAt,
    ended_at: endedAt,
  };

  const { data: byVapi } = await db
    .from('calls')
    .select('id, ended_at')
    .eq('vapi_call_id', call.id)
    .eq('tenant_id', agent.tenant_id)
    .maybeSingle();

  if (byVapi?.ended_at) {
    console.log('[vapi] duplicate call-ended ignored', {
      ...context,
      tenantId: agent.tenant_id,
      existingCallId: byVapi.id,
    });
    await logWebhook(db, {
      tenantId: agent.tenant_id,
      eventType: 'call-ended',
      payload: { call, artifact },
    });
    return { callId: byVapi.id, duplicate: true };
  }

  let callId: string | null = byVapi?.id ?? null;

  if (byVapi) {
    const { data: updated } = await db
      .from('calls')
      .update(updatePayload)
      .eq('id', byVapi.id)
      .select('id')
      .single();
    callId = updated?.id ?? byVapi.id;
  } else {
    const { data: activeCall } = await db
      .from('calls')
      .select('id')
      .eq('agent_id', agent.id)
      .eq('tenant_id', agent.tenant_id)
      .eq('status', 'in_progress')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeCall) {
      const { data: updated } = await db
        .from('calls')
        .update(updatePayload)
        .eq('id', activeCall.id)
        .select('id')
        .single();
      callId = updated?.id ?? activeCall.id;
    } else {
      const { data: inserted } = await db
        .from('calls')
        .insert({
          agent_id: agent.id,
          tenant_id: agent.tenant_id,
          outcome: null,
          ...updatePayload,
        })
        .select('id')
        .single();
      callId = inserted?.id ?? null;
    }
  }

  if (callId) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0]!;
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]!;
    const durationMinutes = Math.ceil((callDurationSeconds ?? 0) / 60);

    await db.rpc('increment_usage', {
      p_tenant_id: agent.tenant_id,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_minutes: durationMinutes,
    });
  }

  console.log('[vapi] call-ended persisted', {
    ...context,
    tenantId: agent.tenant_id,
    agentId: agent.id,
    callId,
  });

  await logWebhook(db, {
    tenantId: agent.tenant_id,
    eventType: 'call-ended',
    payload: { call, artifact },
  });

  return { callId, duplicate: false };
}

export function dispatchPostCallSms(callId: string, tenantId: string): void {
  const baseUrl = process.env.API_BASE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) {
    console.log('[vapi] post-call SMS dispatch skipped — API_BASE_URL or secret missing', {
      callId,
    });
    return;
  }

  void fetch(`${baseUrl}/internal/post-call-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-voxori-internal-secret': secret,
    },
    body: JSON.stringify({ callId, tenantId }),
  }).catch((err) => {
    console.error('[vapi] post-call SMS dispatch failed', { callId, err });
  });
}

export function dispatchRecordingMigrate(params: {
  callId: string;
  tenantId: string;
  recordingUrl: string;
}): void {
  const baseUrl = process.env.API_BASE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) return;

  void fetch(`${baseUrl}/recordings/migrate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-voxori-internal-secret': secret,
    },
    body: JSON.stringify(params),
  }).catch((err) => {
    console.error('[vapi] recording migrate dispatch failed', { callId: params.callId, err });
  });
}
