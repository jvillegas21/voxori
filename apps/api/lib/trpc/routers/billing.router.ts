import { z } from 'zod';
import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';
import Stripe from 'stripe';
import { TRPCError } from '@trpc/server';
import { PLAN_TIERS } from '@voxori/shared/constants';
import type { Database } from '@voxori/database';

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

  /** Self-serve checkout — Starter default; other tiers when Stripe is configured. */
  createCheckoutSession: tenantProcedure
    .input(z.object({ plan: z.enum(['starter', 'professional', 'growth', 'agency']).optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.',
        });
      }

      const plan = (input.plan ?? 'starter') as keyof typeof PLAN_TIERS;
      const planFeatures = PLAN_TIERS[plan];
      if (!planFeatures) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid plan tier' });
      }

      const db = createServiceRoleClient();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

      const [{ data: tenant }, { data: userRow }] = await Promise.all([
        db
          .from('tenants')
          .select('id, name, stripe_customer_id, plan')
          .eq('id', ctx.tenantId)
          .single(),
        db.from('users').select('email').eq('id', ctx.user!.id).single(),
      ]);

      if (!tenant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant not found' });
      }

      let customerId = tenant.stripe_customer_id;
      if (!customerId) {
        const customer = await getStripe().customers.create({
          email: userRow?.email ?? undefined,
          name: tenant.name,
          metadata: { tenant_id: ctx.tenantId, voxori_plan: plan },
        });
        customerId = customer.id;
        await db
          .from('tenants')
          .update({ stripe_customer_id: customerId })
          .eq('id', ctx.tenantId);
      }

      const priceIdEnv = process.env[`STRIPE_${plan.toUpperCase()}_PRICE_ID`];
      const lineItems = priceIdEnv
        ? [{ price: priceIdEnv, quantity: 1 }]
        : [
            {
              price_data: {
                currency: 'usd',
                product_data: { name: `Voxori ${planFeatures.name}` },
                unit_amount: planFeatures.pricePerMonth * 100,
                recurring: { interval: 'month' as const },
              },
              quantity: 1,
            },
          ];

      const session = await getStripe().checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: lineItems,
        allow_promotion_codes: true,
        subscription_data: {
          metadata: {
            voxori_plan: plan,
            tenant_id: ctx.tenantId,
          },
        },
        metadata: {
          voxori_plan: plan,
          tenant_id: ctx.tenantId,
        },
        success_url: `${appUrl}/settings?checkout=success`,
        cancel_url: `${appUrl}/settings?checkout=cancelled`,
      });

      if (!session.url) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Checkout session missing URL' });
      }

      return { url: session.url, plan: plan as Database['public']['Enums']['plan_tier'] };
    }),
});
