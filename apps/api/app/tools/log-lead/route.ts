import { NextRequest, NextResponse } from 'next/server';
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

  console.log('[tool] log-lead called', { agentId: auth.agentId, params });

  // Phase 3: Forward to connected CRM (Follow Up Boss, KW Command, etc.)
  // For Phase 1, log as a call tool event if we have an active call context.

  return NextResponse.json({
    logged: true,
    message: 'Lead information noted. CRM sync will be configured shortly.',
  });
}
