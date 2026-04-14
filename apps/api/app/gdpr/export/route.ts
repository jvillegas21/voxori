import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@voxori/database/client';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim() ?? null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, cookies: { getAll: () => [], setAll: () => {} } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 });

  const db = createServiceRoleClient();

  const [
    { data: tenantData },
    { data: usersData },
    { data: agentsData },
    { data: callsData },
    { data: bookingsData },
    { data: integrationsData },
    { data: usageData },
  ] = await Promise.all([
    db.from('tenants').select('id, name, subdomain, plan, created_at').eq('id', tenantId).single(),
    db.from('users').select('id, email, full_name, role, created_at').eq('tenant_id', tenantId),
    db.from('agents').select('id, name, is_active, llm_model, created_at').eq('tenant_id', tenantId),
    db.from('calls').select('id, caller_number, duration_seconds, status, outcome, started_at, ended_at, summary').eq('tenant_id', tenantId),
    db.from('bookings').select('id, contact_name, contact_phone, showing_address, scheduled_at, status, created_at').eq('tenant_id', tenantId),
    db.from('integrations').select('id, type, is_active, last_synced_at').eq('tenant_id', tenantId),
    db.from('usage_records').select('period_start, period_end, minutes_used').eq('tenant_id', tenantId),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    tenant: tenantData,
    users: usersData ?? [],
    agents: agentsData ?? [],
    calls: callsData ?? [],
    bookings: bookingsData ?? [],
    integrations: integrationsData ?? [],
    usageRecords: usageData ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="voxori-export-${tenantId}-${Date.now()}.json"`,
    },
  });
}
