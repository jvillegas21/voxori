import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';

const leadStatusSchema = z.enum([
  'new',
  'contacted',
  'qualified',
  'nurturing',
  'converted',
  'lost',
]);

export const leadsRouter = router({
  list: tenantProcedure
    .input(
      z
        .object({
          status: leadStatusSchema.optional(),
          limit: z.number().int().min(1).max(100).optional().default(20),
          offset: z.number().int().min(0).optional().default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      let query = db
        .from('leads')
        .select(
          'id, name, phone, email, status, crm_sync_state, area_of_interest, timeline, created_at, call_id'
        )
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (input?.status) query = query.eq('status', input.status);

      const { data, error } = await query;
      if (error) {
        if (error.code === '42P01') return [];
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),

  get: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const { data, error } = await db
        .from('leads')
        .select('*')
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }
      return data;
    }),

  updateStatus: tenantProcedure
    .input(z.object({ id: z.string().uuid(), status: leadStatusSchema }))
    .mutation(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const { data, error } = await db
        .from('leads')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
        .select('id, status')
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      }
      return data;
    }),
});
