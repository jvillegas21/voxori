import { z } from 'zod';

export const agentConfigSchema = z.object({
  greeting: z.string().optional(),
  fallbackMessage: z.string().optional(),
  timezone: z.string().optional(),
  vertical: z.enum(['realtor', 'dental', 'legal', 'general']).optional(),
  recordingDisclosure: z.string().optional(),
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

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
