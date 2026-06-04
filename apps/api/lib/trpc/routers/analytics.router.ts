import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';

const summaryInput = z
  .object({
    days: z.number().int().min(1).max(365).optional().default(30),
  })
  .optional();

export const analyticsRouter = router({
  getSummary: tenantProcedure.input(summaryInput).query(async ({ ctx, input }) => {
    const db = createServiceRoleClient();
    const days = input?.days ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [callsResult, leadsResult, bookingsResult] = await Promise.all([
      db
        .from('calls')
        .select('id, status, outcome, duration_seconds, started_at')
        .eq('tenant_id', ctx.tenantId)
        .gte('started_at', since),
      db
        .from('leads')
        .select('id, status')
        .eq('tenant_id', ctx.tenantId)
        .gte('created_at', since),
      db
        .from('bookings')
        .select('id, status, scheduled_at')
        .eq('tenant_id', ctx.tenantId)
        .gte('scheduled_at', since),
    ]);

    if (callsResult.error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: callsResult.error.message });
    }
    if (leadsResult.error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: leadsResult.error.message });
    }
    if (bookingsResult.error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: bookingsResult.error.message });
    }

    const calls = callsResult.data ?? [];
    const leads = leadsResult.data ?? [];
    const bookings = bookingsResult.data ?? [];

    const totalCalls = calls.length;
    const missedCalls = calls.filter((c) => c.status === 'missed').length;
    const completedCalls = calls.filter((c) => c.status === 'completed');
    const callsWithDuration = completedCalls.filter((c) => c.duration_seconds != null);
    const avgDurationSeconds =
      callsWithDuration.length > 0
        ? Math.round(
            callsWithDuration.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) /
              callsWithDuration.length
          )
        : 0;

    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter((l) =>
      ['qualified', 'converted'].includes(l.status)
    ).length;
    const qualificationRate =
      totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

    const showingsBookedFromCalls = calls.filter((c) => c.outcome === 'scheduled').length;
    const activeBookings = bookings.filter((b) => b.status !== 'cancelled').length;
    const showingsBooked = Math.max(showingsBookedFromCalls, activeBookings);
    const showingBookingRate =
      totalCalls > 0 ? Math.round((showingsBooked / totalCalls) * 100) : 0;

    const completionRate =
      totalCalls > 0 ? Math.round((completedCalls.length / totalCalls) * 100) : 0;

    const outcomeCounts: Record<string, number> = {};
    for (const call of calls) {
      const key = call.outcome ?? 'unknown';
      outcomeCounts[key] = (outcomeCounts[key] ?? 0) + 1;
    }

    return {
      periodDays: days,
      totalCalls,
      missedCalls,
      completionRate,
      avgDurationSeconds,
      totalLeads,
      qualificationRate,
      showingsBooked,
      showingBookingRate,
      outcomeCounts,
    };
  }),
});
