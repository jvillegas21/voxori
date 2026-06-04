import { createServiceRoleClient } from '@voxori/database/client';
import { composeAssistantPayload } from './template-composer';
import { ensureToolSecret } from './tool-secret';
import { parseBusinessProfile } from './template-validation';
import { createVapiAssistant, listVapiAssistants, updateVapiAssistant } from '../vapi/client';

interface AgentTemplateRow {
  id: string;
  name: string;
  vertical: string;
  description: string;
  locked_prompt_core: string;
  default_tools: unknown;
  default_voice: Record<string, unknown> | null;
  editable_fields_schema: unknown;
  version: number;
  is_active: boolean;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeFieldSchema(value: unknown): { fields: Array<{ key: string; type: 'string' | 'string[]' | 'number' | 'boolean'; required: boolean }> } {
  const fallback = { fields: [] as Array<{ key: string; type: 'string' | 'string[]' | 'number' | 'boolean'; required: boolean }> };
  if (!value || typeof value !== 'object' || !('fields' in value)) return fallback;
  const fields = (value as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return fallback;
  return {
    fields: fields
      .filter((field): field is { key: string; type: 'string' | 'string[]' | 'number' | 'boolean'; required: boolean } => {
        if (!field || typeof field !== 'object') return false;
        const candidate = field as Record<string, unknown>;
        return (
          typeof candidate.key === 'string' &&
          ['string', 'string[]', 'number', 'boolean'].includes(String(candidate.type)) &&
          typeof candidate.required === 'boolean'
        );
      })
      .map((field) => ({
        key: field.key,
        type: field.type,
        required: field.required,
      })),
  };
}

async function getTemplateOrThrow(templateId: string): Promise<AgentTemplateRow> {
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from('agent_templates')
    .select('*')
    .eq('id', templateId)
    .eq('is_active', true)
    .single();

  if (error || !data) throw new Error(`Template not found: ${templateId}`);
  return data as AgentTemplateRow;
}

export async function createAgentFromTemplate(params: {
  tenantId: string;
  templateId: string;
  name: string;
  businessProfile: Record<string, unknown>;
  makeActive: boolean;
}) {
  const db = createServiceRoleClient();
  const template = await getTemplateOrThrow(params.templateId);
  const editableSchema = normalizeFieldSchema(template.editable_fields_schema);
  const businessProfile = parseBusinessProfile(params.businessProfile, editableSchema);
  const toolSecret = ensureToolSecret({});
  const payload = composeAssistantPayload({
    templateName: template.name,
    templateDescription: template.description,
    lockedPromptCore: template.locked_prompt_core,
    defaultTools: normalizeStringArray(template.default_tools),
    defaultVoice: template.default_voice,
    templateId: template.id,
    templateVersion: template.version,
    tenantId: params.tenantId,
    agentName: params.name,
    businessProfile,
    toolSecret,
  });

  const assistant = await createVapiAssistant(payload);
  const config = {
    template_id: template.id,
    template_version: template.version,
    business_profile: businessProfile,
    vapi_assistant_id: assistant.id,
    tool_secret: toolSecret,
  };

  const { data: agent, error } = await db
    .from('agents')
    .insert({
      tenant_id: params.tenantId,
      name: params.name,
      is_active: params.makeActive,
      config,
    })
    .select('id, tenant_id, name, is_active, config')
    .single();

  if (error || !agent) throw new Error(error?.message ?? 'Failed to create agent');
  return { agent, assistantId: assistant.id };
}

export async function updateAgentFromTemplate(params: {
  agentId: string;
  tenantId: string;
  businessProfile: Record<string, unknown>;
  makeActive?: boolean;
}) {
  const db = createServiceRoleClient();
  const { data: agent, error: agentError } = await db
    .from('agents')
    .select('id, name, config, tenant_id')
    .eq('id', params.agentId)
    .eq('tenant_id', params.tenantId)
    .single();

  if (agentError || !agent) throw new Error('Agent not found');
  const config = (agent.config ?? {}) as Record<string, unknown>;
  const templateId = config.template_id;
  if (typeof templateId !== 'string') throw new Error('Agent is missing template mapping');

  const template = await getTemplateOrThrow(templateId);
  const editableSchema = normalizeFieldSchema(template.editable_fields_schema);
  const businessProfile = parseBusinessProfile(params.businessProfile, editableSchema);
  const toolSecret = ensureToolSecret(config);
  const payload = composeAssistantPayload({
    templateName: template.name,
    templateDescription: template.description,
    lockedPromptCore: template.locked_prompt_core,
    defaultTools: normalizeStringArray(template.default_tools),
    defaultVoice: template.default_voice,
    templateId: template.id,
    templateVersion: template.version,
    tenantId: params.tenantId,
    agentName: agent.name,
    businessProfile,
    toolSecret,
  });

  const assistantId = config.vapi_assistant_id;
  if (typeof assistantId !== 'string') throw new Error('Agent is missing vapi assistant id');
  await updateVapiAssistant(assistantId, payload);

  const mergedConfig = {
    ...config,
    template_id: template.id,
    template_version: template.version,
    business_profile: businessProfile,
    tool_secret: toolSecret,
  };

  const { data: updated, error: updateError } = await db
    .from('agents')
    .update({
      config: mergedConfig,
      is_active: params.makeActive ?? true,
    })
    .eq('id', params.agentId)
    .eq('tenant_id', params.tenantId)
    .select('id, tenant_id, name, is_active, config')
    .single();

  if (updateError || !updated) throw new Error(updateError?.message ?? 'Failed to update agent');
  return { agent: updated, assistantId };
}

export async function reconcileVapiAssistantMappings() {
  const db = createServiceRoleClient();
  const assistants = await listVapiAssistants();
  const assistantIds = new Set(assistants.map((assistant) => assistant.id));

  const { data: agents, error } = await db
    .from('agents')
    .select('id, tenant_id, name, config')
    .not('config->>vapi_assistant_id', 'is', null);

  if (error) throw new Error(error.message);
  const missingMappings = (agents ?? []).filter((agent) => {
    const config = (agent.config ?? {}) as Record<string, unknown>;
    const assistantId = config.vapi_assistant_id;
    return typeof assistantId === 'string' && !assistantIds.has(assistantId);
  });

  return {
    checkedAgents: agents?.length ?? 0,
    checkedAssistants: assistants.length,
    missingMappings: missingMappings.map((agent) => ({
      agentId: agent.id,
      tenantId: agent.tenant_id,
      name: agent.name,
      assistantId: ((agent.config ?? {}) as Record<string, unknown>).vapi_assistant_id,
    })),
  };
}
