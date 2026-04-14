import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSecret } from '../_auth';
import { parseUpdateAgentFromTemplateInput } from '../../../../lib/agents/template-validation';
import { updateAgentFromTemplate } from '../../../../lib/agents/template-provisioning';

export async function POST(request: NextRequest) {
  const authError = verifyAdminSecret(request);
  if (authError) return authError;

  try {
    const input = parseUpdateAgentFromTemplateInput(await request.json());
    const result = await updateAgentFromTemplate(input);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
