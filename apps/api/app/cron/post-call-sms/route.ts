import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import { authorizeCron } from '../../../lib/cron-auth';
import { retryPendingSmsOutbox } from '../../../lib/services/post-call-sms.service';

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const results = await retryPendingSmsOutbox(db, { limit: 100 });
  const sent = results.filter((row) => row.sent).length;

  return NextResponse.json({
    ok: true,
    attempted: results.length,
    sent,
    results,
  });
}
