import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import { authorizeCron } from '../../../lib/cron-auth';
import { syncAllTenantListings } from '../../../lib/services/mls-sync.service';

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const results = await syncAllTenantListings(db);

  return NextResponse.json({
    ok: true,
    tenantsProcessed: results.length,
    totalSynced: results.reduce((sum, row) => sum + row.synced, 0),
    results,
  });
}
