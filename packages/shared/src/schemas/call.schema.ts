import { z } from 'zod';

export const callStatusSchema = z.enum(['completed', 'missed', 'failed']);
export const callOutcomeSchema = z.enum([
  'scheduled',
  'callback_requested',
  'unqualified',
  'info_only',
]);

export const callFiltersSchema = z.object({
  status: callStatusSchema.optional(),
  outcome: callOutcomeSchema.optional(),
  agentId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export type CallFilters = z.infer<typeof callFiltersSchema>;
