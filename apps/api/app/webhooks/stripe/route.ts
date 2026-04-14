import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceRoleClient } from '@voxori/database/client';
import type { Database } from '@voxori/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Must use raw body string for signature verification — NOT request.json()
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = createServiceRoleClient();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        // Map Stripe price ID to our plan tier — look up via metadata or price ID
        // For now, derive from subscription metadata if set, else keep existing plan
        const planFromMeta = subscription.metadata?.voxori_plan as string | undefined;

        type TenantPlan = Database['public']['Enums']['plan_tier'];
        const validPlans: TenantPlan[] = ['starter', 'professional', 'growth', 'agency'];
        const planUpdate: TenantPlan | undefined = planFromMeta && validPlans.includes(planFromMeta as TenantPlan)
          ? (planFromMeta as TenantPlan)
          : undefined;

        const updatePayload: Database['public']['Tables']['tenants']['Update'] = {
          stripe_subscription_id: subscription.id,
          ...(planUpdate ? { plan: planUpdate } : {}),
        };

        const { error } = await db
          .from('tenants')
          .update(updatePayload)
          .eq('stripe_customer_id', customerId);

        if (error) {
          console.error('[stripe] subscription update failed:', error);
        }

        await db.from('audit_log').insert({
          action: `stripe.subscription.${status}`,
          resource_type: 'subscription',
          resource_id: subscription.id,
          metadata: { customerId, status, planFromMeta },
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Confirm subscription is active for this customer
        const { data: tenant } = await db
          .from('tenants')
          .select('id, plan')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (tenant) {
          await db.from('audit_log').insert({
            tenant_id: tenant.id,
            action: 'stripe.invoice.paid',
            resource_type: 'invoice',
            resource_id: invoice.id,
            metadata: { amount: invoice.amount_paid, currency: invoice.currency },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: tenant } = await db
          .from('tenants')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (tenant) {
          await db.from('audit_log').insert({
            tenant_id: tenant.id,
            action: 'stripe.invoice.payment_failed',
            resource_type: 'invoice',
            resource_id: invoice.id,
            metadata: {
              attempt: invoice.attempt_count,
              nextAttempt: invoice.next_payment_attempt,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await db
          .from('tenants')
          .update({ stripe_subscription_id: null })
          .eq('stripe_customer_id', customerId);

        await db.from('audit_log').insert({
          action: 'stripe.subscription.deleted',
          resource_type: 'subscription',
          resource_id: subscription.id,
          metadata: { customerId },
        });
        break;
      }

      default:
        // Ignore unhandled events — return 200 so Stripe doesn't retry
        break;
    }
  } catch (err) {
    console.error(`[stripe webhook] handler error for ${event.type}:`, err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
