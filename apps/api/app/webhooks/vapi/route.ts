import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';

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

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('x-vapi-secret');
  if (secret !== process.env.VAPI_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: VapiCallEvent;
  try {
    body = await request.json() as VapiCallEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type } = body.message;
  const db = createServiceRoleClient();

  try {
    switch (type) {
      case 'call-started': {
        const call = body.message.call;
        if (!call) break;
        // Call record is created when call ends with full data.
        // On call-started we log for observability only.
        console.log('[vapi] call-started', { callId: call.id });
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

        if (!agent) {
          console.warn('[vapi] call-ended: no agent found for assistantId', call.assistantId);
          break;
        }

        await db.from('calls').insert({
          agent_id: agent.id,
          tenant_id: agent.tenant_id,
          caller_number: call.customer?.number ?? null,
          duration_seconds: artifact?.durationSeconds ?? null,
          status: 'completed',
          outcome: null,
          recording_url: artifact?.recordingUrl ?? null,
          transcript: artifact?.transcript ?? null,
          summary: artifact?.summary ?? null,
          started_at: call.startedAt ?? new Date().toISOString(),
          ended_at: call.endedAt ?? new Date().toISOString(),
        });
        break;
      }

      default:
        // Other event types (transcript, hang, etc.) — log and ignore for Phase 1
        console.log('[vapi] unhandled event type', type);
    }
  } catch (err) {
    console.error('[vapi] webhook processing error', err);
    // Return 200 to prevent Vapi retry storms; log for investigation
  }

  return NextResponse.json({ received: true });
}
