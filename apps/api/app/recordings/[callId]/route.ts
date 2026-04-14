import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceRoleClient } from '@voxori/database/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim() ?? null;
  if (!token) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
  }

  // Validate the JWT
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const tenantId = (user.app_metadata?.tenant_id as string | undefined) ?? null;
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant associated with this session' }, { status: 403 });
  }

  const db = createServiceRoleClient();

  // Verify call belongs to this tenant and get the storage path
  const { data: call, error: callError } = await db
    .from('calls')
    .select('recording_url')
    .eq('id', params.callId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (callError || !call) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 });
  }

  if (!call.recording_url) {
    return NextResponse.json({ error: 'No recording available for this call' }, { status: 404 });
  }

  // Generate a signed URL (1 hour expiry — enough for streaming playback)
  const { data: signedData, error: signError } = await db.storage
    .from('recordings')
    .createSignedUrl(call.recording_url, 3600);

  if (signError || !signedData) {
    console.error('[recordings/signed-url] error:', signError);
    return NextResponse.json({ error: 'Could not generate recording URL' }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: signedData.signedUrl,
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  });
}
