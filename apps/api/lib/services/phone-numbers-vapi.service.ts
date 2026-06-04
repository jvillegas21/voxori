import { importTwilioPhoneNumber } from '../vapi/client';

export interface VapiImportResult {
  attempted: boolean;
  vapiPhoneId: string | null;
  error: string | null;
}

function hasTwilioCredentials(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  if (!sid) return false;
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const apiKey = process.env.TWILIO_API_KEY?.trim();
  const apiSecret = process.env.TWILIO_API_SECRET?.trim();
  return Boolean(authToken || (apiKey && apiSecret));
}

export function shouldImportToVapi(input: {
  twilioSid?: string | null;
  number: string;
}): boolean {
  if (!process.env.VAPI_API_KEY?.trim()) return false;
  if (!hasTwilioCredentials()) return false;
  return Boolean(input.twilioSid?.trim() || input.number.trim());
}

export async function importAgentPhoneToVapi(params: {
  number: string;
  vapiAssistantId: string;
  agentName?: string;
  twilioSid?: string | null;
}): Promise<VapiImportResult> {
  if (!shouldImportToVapi(params)) {
    return { attempted: false, vapiPhoneId: null, error: null };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const apiKey = process.env.TWILIO_API_KEY?.trim();
  const apiSecret = process.env.TWILIO_API_SECRET?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  try {
    const imported = await importTwilioPhoneNumber({
      number: params.number,
      assistantId: params.vapiAssistantId,
      name: params.agentName ? `${params.agentName} line` : undefined,
      twilioAccountSid: accountSid,
      twilioApiKey: apiKey,
      twilioApiSecret: apiSecret,
      twilioAuthToken: authToken,
    });

    return {
      attempted: true,
      vapiPhoneId: imported.id,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { attempted: true, vapiPhoneId: null, error: message };
  }
}

export async function loadAgentVapiAssistantId(
  db: ReturnType<typeof import('@voxori/database/client').createServiceRoleClient>,
  agentId: string,
  tenantId: string
): Promise<string | null> {
  const { data: agent } = await db
    .from('agents')
    .select('name, config')
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!agent) return null;
  const config = (agent.config ?? {}) as Record<string, unknown>;
  const assistantId = config.vapi_assistant_id;
  return typeof assistantId === 'string' && assistantId.trim() ? assistantId.trim() : null;
}
