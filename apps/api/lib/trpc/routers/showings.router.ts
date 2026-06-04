import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';

export const showingsRouter = router({
  list: tenantProcedure
    .input(
      z
        .object({
          status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
          limit: z.number().int().min(1).max(100).optional().default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const limit = input?.limit ?? 20;

      let query = db
        .from('bookings')
        .select(
          'id, contact_name, contact_phone, showing_address, scheduled_at, status, agent_id'
        )
        .eq('tenant_id', ctx.tenantId)
        .order('scheduled_at', { ascending: true })
        .limit(limit);

      if (input?.status) query = query.eq('status', input.status);

      const { data, error } = await query;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),

  get: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const { data, error } = await db
        .from('bookings')
        .select('*')
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Showing not found' });
      }
      return data;
    }),

  cancel: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const { data, error } = await db
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
        .select('id, status')
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Showing not found' });
      }
      return data;
    }),
});
