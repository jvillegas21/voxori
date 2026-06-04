import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@voxori/database/client';

const bodySchema = z.object({
  email: z.string().email(),
  source: z.string().max(64).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const source = parsed.data.source ?? 'web';

  const db = createServiceRoleClient();
  const { error } = await db.from('waitlist_entries').upsert(
    { email, source },
    { onConflict: 'email', ignoreDuplicates: false }
  );

  if (error) {
    console.error('[waitlist] insert failed:', error.message);
    return NextResponse.json({ error: 'Unable to save signup' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
