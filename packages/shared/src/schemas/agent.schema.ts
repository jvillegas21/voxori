import { z } from 'zod';

export const agentTemplateFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['string', 'string[]', 'number', 'boolean']),
  required: z.boolean(),
});

export const agentTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  vertical: z.enum(['realtor', 'dental', 'legal', 'general']),
  description: z.string().min(1),
  lockedPromptCore: z.string().min(1),
  defaultTools: z.array(z.string().min(1)),
  defaultVoice: z.record(z.unknown()),
  editableFieldsSchema: z.object({
    fields: z.array(agentTemplateFieldSchema),
  }),
  version: z.number().int().positive(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const agentConfigSchema = z.object({
  greeting: z.string().optional(),
  fallbackMessage: z.string().optional(),
  timezone: z.string().optional(),
  vertical: z.enum(['realtor', 'dental', 'legal', 'general']).optional(),
  recordingDisclosure: z.string().optional(),
  vapiAssistantId: z.string().optional(),
  templateId: z.string().uuid().optional(),
  templateVersion: z.number().int().positive().optional(),
  businessProfile: z.record(z.unknown()).optional(),
});

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  voiceId: z.string().optional(),
  systemPrompt: z.string().optional(),
  llmModel: z.enum(['gpt-4o', 'claude-3-5-sonnet']).optional().default('gpt-4o'),
  config: agentConfigSchema.optional(),
});

export const updateAgentSchema = createAgentSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createAgentFromTemplateSchema = z.object({
  tenantId: z.string().uuid(),
  templateId: z.string().uuid(),
  name: z.string().min(1).max(100),
  businessProfile: z.record(z.unknown()),
  makeActive: z.boolean().default(true),
});

export const updateAgentFromTemplateSchema = z.object({
  agentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  businessProfile: z.record(z.unknown()),
  makeActive: z.boolean().optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreateAgentFromTemplateInput = z.infer<typeof createAgentFromTemplateSchema>;
export type UpdateAgentFromTemplateInput = z.infer<typeof updateAgentFromTemplateSchema>;
