import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@voxori/database/client';
import { acceptTenantInvitation } from '../../../lib/services/team.service';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();
  if (!accessToken) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawToken = body.token?.trim();
  if (!rawToken) {
    return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
  }

  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await anonClient.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  const db = createServiceRoleClient();

  try {
    const result = await acceptTenantInvitation(db, {
      rawToken,
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({
      tenantId: result.tenantId,
      role: result.role,
      accepted: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to accept invitation';
    const status = message.includes('already linked') ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
