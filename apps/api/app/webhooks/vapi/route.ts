import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import type { Json } from '@voxori/database';
import {
  dispatchPostCallSms,
  dispatchRecordingMigrate,
  handleCallEnded,
  handleCallStarted,
  type VapiCallContext,
} from '../../../lib/services/vapi-call.service';

type VapiEventType =
  | 'call-started'
  | 'call-ended'
  | 'transcript'
  | 'function-call'
  | 'tool-calls'
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
  };
}

function getCallLogContext(body: VapiCallEvent): VapiCallContext {
  return {
    eventType: body.message.type,
    callId: body.message.call?.id ?? null,
    assistantId: body.message.call?.assistantId ?? null,
  };
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-vapi-secret');
  const configuredSecret = process.env.VAPI_WEBHOOK_SECRET;
  if (!configuredSecret || secret !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: VapiCallEvent;
  try {
    body = (await request.json()) as VapiCallEvent;
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
        const call = message.call;
        if (call) await handleCallStarted(db, call, context);
        break;
      }

      case 'call-ended': {
        const call = message.call;
        if (!call) break;

        const { callId, duplicate } = await handleCallEnded(
          db,
          call,
          message.artifact,
          context
        );

        if (callId && !duplicate) {
          const { data: agent } = await db
            .from('agents')
            .select('tenant_id')
            .eq('config->>vapi_assistant_id', call.assistantId)
            .single();

          if (agent) {
            dispatchPostCallSms(callId, agent.tenant_id);
          }

          if (message.artifact?.recordingUrl && agent) {
            dispatchRecordingMigrate({
              callId,
              tenantId: agent.tenant_id,
              recordingUrl: message.artifact.recordingUrl,
            });
          }
        }
        break;
      }

      case 'function-call':
      case 'tool-calls':
        // Phase 1: tool HTTP routes are the source of truth for call_tool_events.
        console.log('[vapi] tool webhook ignored (tools-only persistence)', context);
        void db.from('webhook_logs').insert({
          tenant_id: null,
          integration_type: 'vapi',
          event_type: message.type,
          payload: message as unknown as Json,
          status: 'processed',
        });
        break;

      default:
        console.log('[vapi] unhandled event type', context);
        void db.from('webhook_logs').insert({
          tenant_id: null,
          integration_type: 'vapi',
          event_type: message.type,
          payload: message as unknown as Json,
          status: 'processed',
        });
    }
  } catch (err) {
    console.error('[vapi] webhook processing error', { ...context, err });
    void db.from('webhook_logs').insert({
      tenant_id: null,
      integration_type: 'vapi',
      event_type: type,
      payload: message as unknown as Json,
      status: 'failed',
      error_message: String(err),
    });
  }

  return NextResponse.json({ received: true });
}
