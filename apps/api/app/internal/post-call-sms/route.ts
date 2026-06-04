import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import { processPostCallSms } from '../../../lib/services/post-call-sms.service';

function authorizeInternal(request: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  return request.headers.get('x-voxori-internal-secret') === secret;
}

export async function POST(request: NextRequest) {
  if (!authorizeInternal(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let callId: string;
  let tenantId: string;
  try {
    const body = (await request.json()) as { callId: string; tenantId: string };
    callId = body.callId;
    tenantId = body.tenantId;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!callId || !tenantId) {
    return NextResponse.json(
      { error: 'Missing required fields: callId, tenantId' },
      { status: 400 }
    );
  }

  const db = createServiceRoleClient();
  const result = await processPostCallSms(db, { callId, tenantId });
  return NextResponse.json({ ok: true, ...result });
}
