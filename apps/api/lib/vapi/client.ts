const VAPI_BASE_URL = 'https://api.vapi.ai';

function getVapiApiKey() {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) throw new Error('VAPI_API_KEY is required');
  return apiKey;
}

async function vapiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${VAPI_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getVapiApiKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vapi request failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

export interface VapiAssistant {
  id: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export async function createVapiAssistant(payload: Record<string, unknown>) {
  return vapiRequest<VapiAssistant>('/assistant', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateVapiAssistant(assistantId: string, payload: Record<string, unknown>) {
  return vapiRequest<VapiAssistant>(`/assistant/${assistantId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function listVapiAssistants() {
  return vapiRequest<VapiAssistant[]>('/assistant');
}

export interface VapiPhoneNumber {
  id: string;
  number?: string;
  provider?: string;
  assistantId?: string;
}

export interface ImportTwilioPhoneNumberInput {
  number: string;
  assistantId: string;
  name?: string;
  twilioAccountSid: string;
  twilioAuthToken?: string;
  twilioApiKey?: string;
  twilioApiSecret?: string;
  smsEnabled?: boolean;
}

/** Import a Twilio-owned number into Vapi and link it to an assistant. */
export async function importTwilioPhoneNumber(input: ImportTwilioPhoneNumberInput) {
  const body: Record<string, unknown> = {
    provider: 'twilio',
    number: input.number,
    assistantId: input.assistantId,
    twilioAccountSid: input.twilioAccountSid,
    smsEnabled: input.smsEnabled ?? true,
  };

  if (input.name) body.name = input.name;
  if (input.twilioApiKey && input.twilioApiSecret) {
    body.twilioApiKey = input.twilioApiKey;
    body.twilioApiSecret = input.twilioApiSecret;
  } else if (input.twilioAuthToken) {
    body.twilioAuthToken = input.twilioAuthToken;
  } else {
    throw new Error('Twilio credentials required: API key + secret or auth token');
  }

  return vapiRequest<VapiPhoneNumber>('/phone-number', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
