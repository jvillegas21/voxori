import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router          = t.router;
export const publicProcedure = t.procedure;

export const tenantProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.tenantId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next({
    ctx: {
      ...ctx,
      user:     ctx.user,
      tenantId: ctx.tenantId,
    },
  });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Super-admin access required' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
