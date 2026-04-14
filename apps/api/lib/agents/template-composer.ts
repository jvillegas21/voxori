interface ComposeAssistantInput {
  templateName: string;
  templateDescription: string;
  lockedPromptCore: string;
  defaultTools: string[];
  defaultVoice: Record<string, unknown> | null;
  templateId: string;
  templateVersion: number;
  tenantId: string;
  agentName: string;
  businessProfile: Record<string, unknown>;
}

function formatBusinessContext(businessProfile: Record<string, unknown>): string {
  const rows = Object.entries(businessProfile).map(([key, value]) => {
    if (Array.isArray(value)) return `- ${key}: ${value.join(', ')}`;
    return `- ${key}: ${String(value)}`;
  });

  if (rows.length === 0) return '';
  return `\nBusiness context:\n${rows.join('\n')}`;
}

export function composeAssistantPayload(input: ComposeAssistantInput) {
  const systemPrompt = [
    input.lockedPromptCore.trim(),
    formatBusinessContext(input.businessProfile),
    '\nIf information is missing, ask concise follow-up questions before taking action.',
  ].join('\n');

  const tools = input.defaultTools.map((toolName) => ({
    type: 'function',
    function: {
      name: toolName,
      description: `Execute ${toolName} workflow.`,
      parameters: {
        type: 'object',
        additionalProperties: true,
      },
    },
  }));

  return {
    name: input.agentName,
    firstMessage: `Hi, thanks for calling ${String(input.businessProfile.businessName ?? input.agentName)}. How can I help today?`,
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }],
      tools,
    },
    voice: input.defaultVoice ?? undefined,
    metadata: {
      templateId: input.templateId,
      templateVersion: input.templateVersion,
      tenantId: input.tenantId,
      templateName: input.templateName,
      templateDescription: input.templateDescription,
    },
  };
}
