import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSecret } from '../_auth';
import { createAgentFromTemplate } from '../../../../lib/agents/template-provisioning';
import { parseCreateAgentFromTemplateInput } from '../../../../lib/agents/template-validation';

export async function POST(request: NextRequest) {
  const authError = verifyAdminSecret(request);
  if (authError) return authError;

  try {
    const input = parseCreateAgentFromTemplateInput(await request.json());
    const result = await createAgentFromTemplate(input);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
