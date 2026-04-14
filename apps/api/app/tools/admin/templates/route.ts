import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';
import { verifyAdminSecret } from '../_auth';

export async function GET(request: NextRequest) {
  const authError = verifyAdminSecret(request);
  if (authError) return authError;

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from('agent_templates')
    .select('id, name, vertical, description, editable_fields_schema, version, is_active')
    .eq('is_active', true)
    .order('vertical', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}
