import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';

export async function verifyToolSecret(
  request: NextRequest
): Promise<{ agentId: string; tenantId: string } | NextResponse> {
  const secret = request.headers.get('x-voxori-tool-secret');
  if (!secret) {
    return NextResponse.json({ error: 'Missing X-Voxori-Tool-Secret' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  const { data: agent } = await db
    .from('agents')
    .select('id, tenant_id')
    .eq('config->>tool_secret', secret)
    .single();

  if (!agent) {
    return NextResponse.json({ error: 'Invalid tool secret' }, { status: 401 });
  }

  return { agentId: agent.id, tenantId: agent.tenant_id };
}
