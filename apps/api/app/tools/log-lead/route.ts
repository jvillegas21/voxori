import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import type { Json } from '@voxori/database';
import { verifyToolSecret } from '../_auth';

interface LogLeadParams {
  caller_name?: string;
  caller_phone: string;
  intent?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  const auth = await verifyToolSecret(request);
  if (auth instanceof NextResponse) return auth;

  const params = await request.json() as LogLeadParams;
  const db = createServiceRoleClient();

  // Log lead as a structured webhook event for CRM sync tracking
  void db.from('webhook_logs').insert({
    tenant_id:        auth.tenantId,
    integration_type: 'vapi',
    event_type:       'tool.log-lead',
    payload:          params as unknown as Json,
    status:           'processed',
  });

  return NextResponse.json({
    logged: true,
    message: `Lead logged for ${params.caller_name ?? 'caller'} (${params.caller_phone}). ${
      params.intent ? `Intent: ${params.intent}.` : ''
    } Our team will follow up shortly.`,
  });
}
