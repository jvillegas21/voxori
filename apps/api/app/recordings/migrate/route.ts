import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-voxori-internal-secret');
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let callId: string, tenantId: string, recordingUrl: string;
  try {
    const body = await request.json() as { callId: string; tenantId: string; recordingUrl: string };
    callId = body.callId;
    tenantId = body.tenantId;
    recordingUrl = body.recordingUrl;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!callId || !tenantId || !recordingUrl) {
    return NextResponse.json({ error: 'Missing required fields: callId, tenantId, recordingUrl' }, { status: 400 });
  }

  const db = createServiceRoleClient();

  try {
    // 1. Download recording from Vapi
    const vapiResponse = await fetch(recordingUrl, {
      headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` },
    });
    if (!vapiResponse.ok) {
      throw new Error(`Vapi recording fetch failed: ${vapiResponse.status} ${vapiResponse.statusText}`);
    }
    const audioBuffer = await vapiResponse.arrayBuffer();

    // 2. Upload to Supabase Storage (private recordings bucket)
    // Path: tenants/{tenant_id}/calls/{call_id}/recording.mp3
    const storagePath = `tenants/${tenantId}/calls/${callId}/recording.mp3`;
    const { error: uploadError } = await db.storage
      .from('recordings')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // 3. Update calls.recording_url to the storage path (not a signed URL)
    const { error: updateError } = await db
      .from('calls')
      .update({ recording_url: storagePath })
      .eq('id', callId)
      .eq('tenant_id', tenantId);
    if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

    return NextResponse.json({ migrated: true, path: storagePath });
  } catch (err) {
    console.error('[recordings/migrate] error:', { callId, tenantId, err });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
