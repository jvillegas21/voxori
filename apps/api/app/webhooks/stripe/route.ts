import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@voxori/database/client';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  // NOTE: Full Stripe webhook signature verification requires the raw body
  // and stripe.webhooks.constructEvent(). Stripe SDK install happens in Phase 1.
  // For now, this stub logs events and returns 200.

  const body = await request.json() as { type: string; data: { object: Record<string, unknown> } };
  const db = createServiceRoleClient();

  console.log('[stripe] event received', body.type);

  switch (body.type) {
    case 'invoice.paid': {
      // Update subscription status, reset usage record for new period
      console.log('[stripe] invoice.paid', body.data.object);
      break;
    }
    case 'customer.subscription.updated': {
      // Sync plan tier change to tenants table
      console.log('[stripe] subscription.updated', body.data.object);
      break;
    }
    case 'invoice.payment_failed': {
      // Begin grace period; agent suspension handled in Phase 2
      console.log('[stripe] payment_failed', body.data.object);
      break;
    }
    default:
      console.log('[stripe] unhandled event', body.type);
  }

  return NextResponse.json({ received: true });
}
