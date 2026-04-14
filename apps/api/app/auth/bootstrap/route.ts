import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@voxori/database/client';

export async function POST(request: NextRequest) {
  // 1. Extract Bearer token
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();
  if (!accessToken) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
  }

  // 2. Validate the JWT by calling getUser() (makes a server-side request to Supabase Auth)
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  );
  const { data: { user }, error: userError } = await anonClient.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // 3. Idempotency check — if public.users row exists, bootstrap already ran
  const db = createServiceRoleClient();
  const { data: existingUser } = await db
    .from('users')
    .select('id, tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.json({
      tenantId: existingUser.tenant_id,
      userId: existingUser.id,
      alreadyBootstrapped: true,
    });
  }

  // 4. Extract metadata from user_metadata (set at signUp time via options.data)
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const companyName =
    typeof meta.company_name === 'string' && meta.company_name.trim()
      ? meta.company_name.trim()
      : 'My Company';
  const rawSubdomain =
    typeof meta.subdomain === 'string' && meta.subdomain.trim()
      ? meta.subdomain.trim()
      : user.id.slice(0, 8);
  const subdomain = rawSubdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() || null : null;
  const email = user.email!;

  // 5. Atomic bootstrap via RPC (defined in migration 008)
  const { data: result, error: rpcError } = await db.rpc('bootstrap_new_tenant', {
    p_user_id:     user.id,
    p_email:       email,
    p_full_name:   fullName,
    p_tenant_name: companyName,
    p_subdomain:   subdomain,
  });

  if (rpcError) {
    console.error('[bootstrap] RPC error:', rpcError);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json(result);
}
