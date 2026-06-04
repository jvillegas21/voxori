interface JsonSchemaProperty {
  type: string;
  description?: string;
  items?: { type: string };
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, JsonSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

const CALL_ID_PROPERTY: JsonSchemaProperty = {
  type: 'string',
  description: 'Vapi call id (optional — resolved from active call when omitted).',
};

const KNOWN_TOOLS: Record<string, ToolDefinition> = {
  'record-consent': {
    name: 'record-consent',
    description:
      'Record caller SMS/recording consent after TCPA disclosure. Call early in the buyer flow.',
    parameters: {
      type: 'object',
      properties: {
        consent_given: {
          type: 'boolean',
          description: 'True when caller opts in to SMS listing updates.',
        },
        consent_state: {
          type: 'string',
          description: 'Optional jurisdiction or consent variant (e.g. tx, verbal).',
        },
        call_id: CALL_ID_PROPERTY,
        callId: CALL_ID_PROPERTY,
      },
      required: ['consent_given'],
      additionalProperties: false,
    },
  },
  'log-lead': {
    name: 'log-lead',
    description:
      'Save qualified lead details. Use intent buyer or seller. Idempotent per call when criteria unchanged.',
    parameters: {
      type: 'object',
      properties: {
        caller_phone: { type: 'string', description: 'Caller phone in E.164 format.' },
        caller_name: { type: 'string', description: 'Caller full name.' },
        caller_email: { type: 'string', description: 'Caller email address.' },
        intent: {
          type: 'string',
          description: 'buyer or seller (also accepts buying/selling).',
        },
        notes: { type: 'string', description: 'Additional qualification notes.' },
        budget_min: { type: 'number', description: 'Minimum budget in USD.' },
        budget_max: { type: 'number', description: 'Maximum budget in USD.' },
        timeline: { type: 'string', description: 'Purchase or sale timeline.' },
        financing_status: { type: 'string', description: 'Pre-approved, cash, exploring, etc.' },
        area_of_interest: { type: 'string', description: 'City, neighborhood, or region.' },
        beds: { type: 'number', description: 'Minimum bedrooms.' },
        baths: { type: 'number', description: 'Minimum bathrooms.' },
        call_id: CALL_ID_PROPERTY,
        callId: CALL_ID_PROPERTY,
      },
      required: ['caller_phone'],
      additionalProperties: false,
    },
  },
  'search-listings': {
    name: 'search-listings',
    description:
      'Search MLS/IDX listings for buyer criteria. Requires beds, budget, and ZIP codes when possible.',
    parameters: {
      type: 'object',
      properties: {
        min_bedrooms: { type: 'number', description: 'Minimum bedrooms.' },
        max_price: { type: 'number', description: 'Maximum list price in USD.' },
        zip_codes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Up to 5 ZIP codes to search.',
        },
        min_sqft: { type: 'number', description: 'Minimum square footage.' },
        market: {
          type: 'string',
          description: 'Market id (default idx_broker_primary).',
        },
        call_id: CALL_ID_PROPERTY,
        callId: CALL_ID_PROPERTY,
      },
      additionalProperties: false,
    },
  },
  'send-confirmation': {
    name: 'send-confirmation',
    description:
      'Send an SMS confirmation during the call. Requires prior SMS consent and configured Twilio number.',
    parameters: {
      type: 'object',
      properties: {
        to_phone: { type: 'string', description: 'Destination phone in E.164 format.' },
        message: { type: 'string', description: 'SMS body (keep concise; include opt-out language).' },
        call_id: CALL_ID_PROPERTY,
        callId: CALL_ID_PROPERTY,
      },
      required: ['to_phone', 'message'],
      additionalProperties: false,
    },
  },
  'book-showing': {
    name: 'book-showing',
    description: 'Schedule a property showing on the agent calendar.',
    parameters: {
      type: 'object',
      properties: {
        caller_name: { type: 'string' },
        caller_phone: { type: 'string' },
        listing_address: { type: 'string' },
        preferred_date: { type: 'string' },
        preferred_time: { type: 'string' },
        call_id: CALL_ID_PROPERTY,
        callId: CALL_ID_PROPERTY,
      },
      required: ['caller_phone'],
      additionalProperties: false,
    },
  },
  'check-availability': {
    name: 'check-availability',
    description: 'Check agent calendar availability for a date and time.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'ISO date YYYY-MM-DD.' },
        time: { type: 'string', description: 'Local time HH:MM.' },
        duration_minutes: { type: 'number', description: 'Slot length in minutes.' },
        call_id: CALL_ID_PROPERTY,
        callId: CALL_ID_PROPERTY,
      },
      required: ['date', 'time'],
      additionalProperties: false,
    },
  },
};

export function resolveApiBaseUrl(): string {
  const raw =
    process.env.VOXORI_API_URL ??
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:3002';
  return raw.replace(/\/$/, '');
}

function fallbackToolDefinition(toolName: string): ToolDefinition {
  return {
    name: toolName,
    description: `Execute ${toolName} workflow.`,
    parameters: {
      type: 'object',
      properties: {
        call_id: CALL_ID_PROPERTY,
        callId: CALL_ID_PROPERTY,
      },
      additionalProperties: true,
    },
  };
}

export function buildVapiHttpTool(
  toolName: string,
  apiBaseUrl: string,
  toolSecret: string
): Record<string, unknown> {
  const definition = KNOWN_TOOLS[toolName] ?? fallbackToolDefinition(toolName);

  return {
    type: 'function',
    function: {
      name: definition.name,
      description: definition.description,
      parameters: definition.parameters,
    },
    server: {
      url: `${apiBaseUrl}/tools/${toolName}`,
      headers: {
        'X-Voxori-Tool-Secret': toolSecret,
      },
    },
  };
}

export function buildVapiHttpTools(
  toolNames: string[],
  apiBaseUrl: string,
  toolSecret: string
): Record<string, unknown>[] {
  return toolNames.map((name) => buildVapiHttpTool(name, apiBaseUrl, toolSecret));
}
