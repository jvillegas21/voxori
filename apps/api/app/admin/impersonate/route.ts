import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-voxori-admin-secret, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  // Verify admin secret
  const secret = request.headers.get('x-voxori-admin-secret');
  if (!secret || secret !== process.env.ADMIN_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tenantId, actorUserId } = await request.json() as {
    tenantId: string;
    actorUserId: string;
  };

  if (!tenantId || !actorUserId) {
    return NextResponse.json({ error: 'Missing tenantId or actorUserId' }, { status: 400 });
  }

  // Extract the real acting admin user from Bearer JWT
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim() ?? null;
  let realActorUserId: string = actorUserId; // fallback to client-provided

  if (token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64').toString());
      if (payload.sub) realActorUserId = payload.sub as string;
    } catch { /* use fallback */ }
  }

  const db = createServiceRoleClient();

  // Find the client_admin user for this tenant
  const { data: targetUser } = await db
    .from('users')
    .select('id, email')
    .eq('tenant_id', tenantId)
    .eq('role', 'client_admin')
    .maybeSingle();

  if (!targetUser) {
    return NextResponse.json({ error: 'No client_admin found for this tenant' }, { status: 404 });
  }

  // Generate a magic link using Supabase Admin API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ type: 'magiclink', email: targetUser.email }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[impersonate] generate-link error:', err);
    return NextResponse.json({ error: 'Failed to generate impersonation link' }, { status: 500 });
  }

  const { action_link } = await res.json() as { action_link: string };

  // Audit log the impersonation
  await db.from('audit_log').insert({
    actor_user_id: realActorUserId,
    actor_role:    'super_admin',
    action:        'tenant.impersonate',
    resource_type: 'tenant',
    resource_id:   tenantId,
    tenant_id:     tenantId,
    metadata: {
      target_user_id: targetUser.id,
      target_email:   targetUser.email,
      expires_in_minutes: 60,
    },
  });

  return NextResponse.json({ actionLink: action_link, targetEmail: targetUser.email });
}
