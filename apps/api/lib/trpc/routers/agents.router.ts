import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';
import type { Database } from '@voxori/database/types';

type AgentUpdate = Database['public']['Tables']['agents']['Update'];

export const agentsRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('agents')
      .select('id, name, is_active, voice_id, llm_model, config, created_at')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? [];
  }),

  get: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const { data, error } = await db
        .from('agents')
        .select('*')
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
        .single();

      if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      return data;
    }),

  update: tenantProcedure
    .input(
      z.object({
        id:   z.string().uuid(),
        data: z.object({
          name:         z.string().min(1).optional(),
          voiceId:      z.string().optional(),
          systemPrompt: z.string().optional(),
          llmModel:     z.string().optional(),
          isActive:     z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const payload: AgentUpdate = {};
      if (input.data.name         !== undefined) payload.name          = input.data.name;
      if (input.data.voiceId      !== undefined) payload.voice_id      = input.data.voiceId;
      if (input.data.systemPrompt !== undefined) payload.system_prompt = input.data.systemPrompt;
      if (input.data.llmModel     !== undefined) payload.llm_model     = input.data.llmModel;
      if (input.data.isActive     !== undefined) payload.is_active     = input.data.isActive;

      if (Object.keys(payload).length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No fields to update' });
      }

      const { data, error } = await db
        .from('agents')
        .update(payload)
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
        .select()
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Update failed' });
      }
      return data;
    }),
});
