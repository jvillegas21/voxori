import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';

const callFiltersInput = z.object({
  status:    z.enum(['completed', 'missed', 'failed', 'in_progress']).optional(),
  outcome:   z.enum(['scheduled', 'callback_requested', 'unqualified', 'info_only']).optional(),
  agentId:   z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate:   z.string().optional(),
  limit:     z.number().int().min(1).max(100).optional().default(20),
  offset:    z.number().int().min(0).optional().default(0),
});

export const callsRouter = router({
  list: tenantProcedure
    .input(callFiltersInput.optional())
    .query(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const limit  = input?.limit  ?? 20;
      const offset = input?.offset ?? 0;

      let query = db
        .from('calls')
        .select('id, agent_id, caller_number, duration_seconds, status, outcome, started_at, ended_at, summary')
        .eq('tenant_id', ctx.tenantId)
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (input?.status)    query = query.eq('status', input.status);
      if (input?.outcome)   query = query.eq('outcome', input.outcome);
      if (input?.agentId)   query = query.eq('agent_id', input.agentId);
      if (input?.startDate) query = query.gte('started_at', input.startDate);
      if (input?.endDate)   query = query.lte('started_at', input.endDate);

      const { data, error } = await query;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),

  get: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const { data, error } = await db
        .from('calls')
        .select('*, call_tool_events(*)')
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
        .single();

      if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Call not found' });
      return data;
    }),

  getActive: tenantProcedure.query(async ({ ctx }) => {
    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('calls')
      .select('id, agent_id, caller_number, status, started_at, ended_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'in_progress')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? null;
  }),
});
