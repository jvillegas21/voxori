import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';
import { syncTenantListings } from '../../services/mls';

const listInput = z.object({
  status: z.enum(['active', 'pending', 'sold']).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

export const listingsRouter = router({
  list: tenantProcedure.input(listInput.optional()).query(async ({ ctx, input }) => {
    const db = createServiceRoleClient();
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;

    let query = db
      .from('listings')
      .select(
        'id, mls_id, address, price, bedrooms, bathrooms, sqft, status, synced_at, integration_id, originating_system_name'
      )
      .eq('tenant_id', ctx.tenantId)
      .order('synced_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
        .from('listings')
        .select('*')
        .eq('id', input.id)
        .eq('tenant_id', ctx.tenantId)
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
      }
      return data;
    }),

  sync: tenantProcedure.mutation(async ({ ctx }) => {
    const db = createServiceRoleClient();
    const synced = await syncTenantListings(db, ctx.tenantId);
    return {
      synced,
      message:
        synced === 0
          ? 'No listings synced. Confirm your IDX account has featured listings, or reconnect MLS with a valid API key.'
          : `Synced ${synced} listing${synced === 1 ? '' : 's'}.`,
    };
  }),
});
