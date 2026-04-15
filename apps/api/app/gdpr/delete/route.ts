import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@voxori/database/client';

export async function POST(request: NextRequest) {
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

  const body = await request.json() as { confirmation?: string };
  if (body.confirmation !== 'DELETE MY DATA') {
    return NextResponse.json({ error: 'Confirmation string required: "DELETE MY DATA"' }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Get all auth user IDs for this tenant before deletion
  const { data: tenantUsers } = await db
    .from('users')
    .select('id')
    .eq('tenant_id', tenantId);

  // Delete in FK-safe order (children first)
  await db.from('call_tool_events').delete().in('call_id',
    (await db.from('calls').select('id').eq('tenant_id', tenantId)).data?.map(c => c.id) ?? []
  );
  await db.from('bookings').delete().eq('tenant_id', tenantId);
  await db.from('calls').delete().eq('tenant_id', tenantId);
  await db.from('listings').delete().eq('tenant_id', tenantId);
  await db.from('integrations').delete().eq('tenant_id', tenantId);
  await db.from('usage_records').delete().eq('tenant_id', tenantId);
  await db.from('phone_numbers').delete().eq('tenant_id', tenantId);
  await db.from('agents').delete().eq('tenant_id', tenantId);
  await db.from('users').delete().eq('tenant_id', tenantId);
  await db.from('tenants').delete().eq('id', tenantId);

  // Delete auth users
  const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  for (const u of tenantUsers ?? []) {
    try {
      await fetch(`${supabaseAdminUrl}/auth/v1/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
      });
    } catch (err) {
      console.error(`[gdpr/delete] failed to delete auth user ${u.id}:`, err);
      // Continue — don't stop the whole operation for one user
    }
  }

  return NextResponse.json({ deleted: true, tenantId });
}
