import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSecret } from '../_auth';
import { reconcileVapiAssistantMappings } from '../../../../lib/agents/template-provisioning';

export async function GET(request: NextRequest) {
  const authError = verifyAdminSecret(request);
  if (authError) return authError;

  try {
    const result = await reconcileVapiAssistantMappings();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
