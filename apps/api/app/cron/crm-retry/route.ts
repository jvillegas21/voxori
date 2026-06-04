import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import { authorizeCron } from '../../../lib/cron-auth';
import { retryFailedCrmSyncs } from '../../../lib/services/crm-retry.service';

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const results = await retryFailedCrmSyncs(db, { limit: 100 });
  const synced = results.filter((row) => row.synced).length;

  return NextResponse.json({
    ok: true,
    attempted: results.length,
    synced,
    results,
  });
}
