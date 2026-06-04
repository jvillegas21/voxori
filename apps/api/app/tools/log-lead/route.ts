import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import type { Json } from '@voxori/database';
import {
  authenticateToolRequest,
  logToolExecution,
  parseToolJsonBody,
  resolveToolCallId,
} from '../../../lib/services/tool-route-helper';
import { pushLeadToFub } from '../../../lib/services/fub.service';

interface LogLeadParams {
  caller_name?: string;
  caller_phone: string;
  caller_email?: string;
  intent?: string;
  notes?: string;
  budget_min?: number;
  budget_max?: number;
  timeline?: string;
  financing_status?: string;
  area_of_interest?: string;
  beds?: number;
  baths?: number;
  callId?: string;
  call_id?: string;
}

function normalizeLeadIntent(intent?: string): 'buyer' | 'seller' | null {
  if (!intent?.trim()) return null;
  const value = intent.trim().toLowerCase();
  if (value === 'buyer' || value === 'buying' || value === 'buy') return 'buyer';
  if (value === 'seller' || value === 'selling' || value === 'sell') return 'seller';
  return null;
}

function buildLeadNotes(intent?: string, notes?: string): string | null {
  const normalizedIntent = normalizeLeadIntent(intent);
  const intentLabel = normalizedIntent
    ? `Intent: ${normalizedIntent}`
    : intent?.trim()
      ? `Intent: ${intent.trim()}`
      : null;
  const trimmedNotes = notes?.trim();
  if (intentLabel && trimmedNotes) return `${intentLabel} — ${trimmedNotes}`;
  return intentLabel ?? trimmedNotes ?? null;
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  const auth = await authenticateToolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseToolJsonBody<LogLeadParams>(request);
  if (parsed instanceof NextResponse) return parsed;
  const { body: params, callId } = parsed;

  const db = createServiceRoleClient();
  const internalCallId = await resolveToolCallId(
    request,
    auth,
    params as unknown as Record<string, unknown>
  );
  const leadNotes = buildLeadNotes(params.intent, params.notes);
  const normalizedIntent = normalizeLeadIntent(params.intent);

  const { data: lead, error: leadError } = await db
    .from('leads')
    .insert({
      tenant_id: auth.tenantId,
      agent_id: auth.agentId,
      call_id: internalCallId,
      name: params.caller_name?.trim() || 'Unknown caller',
      phone: params.caller_phone,
      email: params.caller_email ?? null,
      budget_min: params.budget_min ?? null,
      budget_max: params.budget_max ?? null,
      timeline: params.timeline ?? null,
      financing_status: params.financing_status ?? null,
      area_of_interest: params.area_of_interest ?? null,
      beds: params.beds ?? null,
      baths: params.baths ?? null,
      notes: leadNotes,
      status: normalizedIntent === 'buyer' ? 'qualified' : 'new',
      crm_sync_state: 'pending',
    })
    .select('id')
    .single();

  void db.from('webhook_logs').insert({
    tenant_id: auth.tenantId,
    integration_type: 'vapi',
    event_type: 'tool.log-lead',
    payload: { ...params, lead_id: lead?.id ?? null, call_id: internalCallId } as unknown as Json,
    status: leadError ? 'failed' : 'processed',
    error_message: leadError?.message ?? null,
  });

  if (leadError || !lead) {
    const failure = {
      logged: false,
      message: 'Failed to save lead. Please try again.',
    };
    void logToolExecution({
      request,
      auth,
      toolName: 'log-lead',
      callId,
      body: params as unknown as Record<string, unknown>,
      input: params as unknown as Record<string, unknown>,
      output: failure,
      durationMs: Date.now() - started,
      status: 'error',
    });
    return NextResponse.json(failure, { status: 500 });
  }

  const crmResult = await pushLeadToFub(db, auth.tenantId, lead.id, {
    name: params.caller_name?.trim() || 'Unknown caller',
    phone: params.caller_phone,
    email: params.caller_email,
    notes: leadNotes,
    areaOfInterest: params.area_of_interest,
    timeline: params.timeline,
  });

  const response = {
    logged: true,
    lead_id: lead.id,
    call_id: internalCallId,
    crm_synced: crmResult.synced,
    crm_external_id: crmResult.externalId,
    message: `Lead logged for ${params.caller_name ?? 'caller'} (${params.caller_phone}). ${
      normalizedIntent ? `Intent: ${normalizedIntent}.` : ''
    } Our team will follow up shortly.`,
  };

  void logToolExecution({
    request,
    auth,
    toolName: 'log-lead',
    callId,
    body: params as unknown as Record<string, unknown>,
    input: params as unknown as Record<string, unknown>,
    output: response,
    durationMs: Date.now() - started,
  });

  return NextResponse.json(response);
}
