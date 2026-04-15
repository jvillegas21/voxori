import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import type { Json } from '@voxori/database';

// Vapi event types we handle
type VapiEventType =
  | 'call-started'
  | 'call-ended'
  | 'transcript'
  | 'function-call'
  | 'hang';

interface VapiCallEvent {
  message: {
    type: VapiEventType;
    call?: {
      id: string;
      assistantId: string;
      customer?: { number: string };
      startedAt?: string;
      endedAt?: string;
    };
    artifact?: {
      transcript?: string;
      recordingUrl?: string;
      summary?: string;
      durationSeconds?: number;
    };
    functionCall?: {
      name: string;
      parameters: Record<string, unknown>;
    };
  };
}

function getCallLogContext(body: VapiCallEvent) {
  return {
    eventType: body.message.type,
    callId: body.message.call?.id ?? null,
    assistantId: body.message.call?.assistantId ?? null,
  };
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('x-vapi-secret');
  const configuredSecret = process.env.VAPI_WEBHOOK_SECRET;
  if (!configuredSecret || secret !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: VapiCallEvent;
  try {
    body = await request.json() as VapiCallEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { message } = body;
  const { type } = message;
  const db = createServiceRoleClient();
  const context = getCallLogContext(body);

  try {
    switch (type) {
      case 'call-started': {
        const call = body.message.call;
        if (!call) break;
        // Call record is created when call ends with full data.
        // On call-started we log for observability only.
        console.log('[vapi] call-started', context);
        void db.from('webhook_logs').insert({
          tenant_id:        null,
          integration_type: 'vapi',
          event_type:       message.type,
          payload:          message as unknown as Json,
          status:           'processed',
        });
        break;
      }

      case 'call-ended': {
        const call = body.message.call;
        const artifact = body.message.artifact;
        if (!call) break;

        // Look up agent by Vapi assistantId to get tenant context
        const { data: agent } = await db
          .from('agents')
          .select('id, tenant_id')
          .eq('config->>vapi_assistant_id', call.assistantId)
          .single();

        const agentTenantId = agent?.tenant_id ?? null;

        if (!agent) {
          console.warn('[vapi] call-ended: no agent found for assistant mapping', context);
          void db.from('webhook_logs').insert({
            tenant_id:        null,
            integration_type: 'vapi',
            event_type:       message.type,
            payload:          message as unknown as Json,
            status:           'processed',
          });
          break;
        }

        // Idempotency guard: avoid duplicate call-ended inserts when provider retries.
        const startedAt = call.startedAt ?? new Date().toISOString();
        const endedAt = call.endedAt ?? new Date().toISOString();
        const callerNumber = call.customer?.number ?? null;
        let existingCallQuery = db
          .from('calls')
          .select('id')
          .eq('agent_id', agent.id)
          .eq('tenant_id', agent.tenant_id)
          .eq('started_at', startedAt)
          .eq('ended_at', endedAt);

        existingCallQuery =
          callerNumber === null
            ? existingCallQuery.is('caller_number', null)
            : existingCallQuery.eq('caller_number', callerNumber);

        const { data: existingCall } = await existingCallQuery.maybeSingle();

        if (existingCall) {
          console.log('[vapi] duplicate call-ended event ignored', {
            ...context,
            tenantId: agent.tenant_id,
            agentId: agent.id,
            existingCallId: existingCall.id,
          });
          void db.from('webhook_logs').insert({
            tenant_id:        agentTenantId,
            integration_type: 'vapi',
            event_type:       message.type,
            payload:          message as unknown as Json,
            status:           'processed',
          });
          break;
        }

        const callDurationSeconds = artifact?.durationSeconds ?? null;
        const { data: insertedCall } = await db.from('calls').insert({
          agent_id: agent.id,
          tenant_id: agent.tenant_id,
          caller_number: callerNumber,
          duration_seconds: callDurationSeconds,
          status: 'completed',
          outcome: null,
          recording_url: artifact?.recordingUrl ?? null,
          transcript: artifact?.transcript ?? null,
          summary: artifact?.summary ?? null,
          started_at: startedAt,
          ended_at: endedAt,
        }).select('id').single();
        console.log('[vapi] call-ended persisted', {
          ...context,
          tenantId: agent.tenant_id,
          agentId: agent.id,
        });

        // Upsert usage_records for current billing period
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]!;
        const durationMinutes = Math.ceil((callDurationSeconds ?? 0) / 60);

        await db.rpc('increment_usage', {
          p_tenant_id:    agent.tenant_id,
          p_period_start: periodStart,
          p_period_end:   periodEnd,
          p_minutes:      durationMinutes,
        });

        if (insertedCall && artifact?.recordingUrl) {
          void fetch(`${process.env.API_BASE_URL}/recordings/migrate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-voxori-internal-secret': process.env.INTERNAL_API_SECRET ?? '',
            },
            body: JSON.stringify({
              callId:       insertedCall.id,
              tenantId:     agent.tenant_id,
              recordingUrl: artifact.recordingUrl,
            }),
          });
        }

        void db.from('webhook_logs').insert({
          tenant_id:        agentTenantId,
          integration_type: 'vapi',
          event_type:       message.type,
          payload:          message as unknown as Json,
          status:           'processed',
        });
        break;
      }

      default:
        // Other event types (transcript, hang, etc.) — log and ignore for Phase 1
        console.log('[vapi] unhandled event type', context);
        void db.from('webhook_logs').insert({
          tenant_id:        null,
          integration_type: 'vapi',
          event_type:       message.type,
          payload:          message as unknown as Json,
          status:           'processed',
        });
    }
  } catch (err) {
    console.error('[vapi] webhook processing error', { ...context, err });
    // Return 200 to prevent Vapi retry storms; log for investigation
    void db.from('webhook_logs').insert({
      tenant_id:        null,
      integration_type: 'vapi',
      event_type:       type,
      payload:          message as unknown as Json,
      status:           'failed',
      error_message:    String(err),
    });
  }

  return NextResponse.json({ received: true });
}
