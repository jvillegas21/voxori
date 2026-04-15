import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';
import Stripe from 'stripe';
import { TRPCError } from '@trpc/server';

// Lazy init: only create Stripe client when first needed so missing
// STRIPE_SECRET_KEY doesn't crash the server or test runner on import.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Stripe is not configured.' });
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia' as any,
    });
  }
  return _stripe;
}

export const billingRouter = router({
  getUsageSummary: tenantProcedure.query(async ({ ctx }) => {
    const db = createServiceRoleClient();
    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: usage } = await db
      .from('usage_records')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .eq('period_start', periodStart)
      .maybeSingle();

    const { data: tenant } = await db
      .from('tenants')
      .select('plan, stripe_customer_id, stripe_subscription_id')
      .eq('id', ctx.tenantId)
      .single();

    return { usage, tenant };
  }),

  createPortalSession: tenantProcedure.mutation(async ({ ctx }) => {
    const db = createServiceRoleClient();
    const { data: tenant } = await db
      .from('tenants')
      .select('stripe_customer_id')
      .eq('id', ctx.tenantId)
      .single();

    if (!tenant?.stripe_customer_id) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No Stripe customer found. Contact support.' });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/settings`,
    });

    return { url: session.url };
  }),
});
