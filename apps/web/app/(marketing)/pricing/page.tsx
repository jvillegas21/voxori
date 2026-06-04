import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { PLAN_TIERS } from '@voxori/shared/constants';
import { Button } from '@/components/ui/button';
import { PricingCheckoutButton } from '@/components/marketing/pricing-checkout-button';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

export const metadata: Metadata = {
  title: 'Voxori Pricing — Plans for Every Agent',
  description:
    'Simple hybrid pricing with included minutes. Starter, Professional, Growth, and Agency tiers for residential real estate agents and teams.',
};

const TIER_ORDER = ['starter', 'professional', 'growth', 'agency'] as const;

type PlanTierKey = (typeof TIER_ORDER)[number];

const TIER_COPY: Record<
  PlanTierKey,
  { description: string; features: string[]; highlighted: boolean; cta: string }
> = {
  starter: {
    description: 'For individual agents getting started.',
    features: [
      '1 voice agent',
      '200 included minutes',
      'Google Calendar booking',
      'SMS follow-up',
      '30-day call recordings',
    ],
    highlighted: true,
    cta: 'Start free trial',
  },
  professional: {
    description: 'For agents who need MLS and CRM sync.',
    features: [
      '1 voice agent',
      '600 included minutes',
      'MLS integration',
      'CRM sync (Follow Up Boss + HubSpot)',
      'Voice cloning',
      '90-day call recordings',
    ],
    highlighted: false,
    cta: 'Start free trial',
  },
  growth: {
    description: 'For small teams scaling lead volume.',
    features: [
      'Up to 3 voice agents',
      '1,500 included minutes',
      'MLS + CRM integration',
      'Subdomain white-label',
      '1-year call recordings',
      'Email + chat support',
    ],
    highlighted: false,
    cta: 'Start free trial',
  },
  agency: {
    description: 'For brokerages and large teams.',
    features: [
      'Unlimited voice agents',
      '4,000 included minutes',
      'Multi-MLS support',
      'Full white-label branding',
      'Dedicated CSM',
      'Unlimited call recordings',
    ],
    highlighted: false,
    cta: 'Book a demo',
  },
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />

      <main className="mx-auto max-w-6xl flex-1 px-6 py-16">
        <div>
          <h1 className="font-heading text-4xl font-semibold text-foreground">Simple pricing</h1>
          <p className="mt-3 text-muted-foreground">
            Hybrid plans with included minutes. Overage billed per minute.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {TIER_ORDER.map((tierKey) => {
            const plan = PLAN_TIERS[tierKey]!;
            const copy = TIER_COPY[tierKey];

            return (
              <article
                key={tierKey}
                className={`card-lift flex flex-col rounded-2xl border p-8 ${
                  copy.highlighted
                    ? 'border-primary shadow-lg ring-1 ring-primary/20'
                    : 'border-border/60'
                }`}
              >
                <h2 className="font-heading text-xl font-semibold">{plan.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
                <p className="mt-6">
                  <span className="font-heading text-4xl font-semibold">
                    ${plan.pricePerMonth}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {copy.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                {tierKey === 'starter' ? (
                  <div className="mt-8">
                    <PricingCheckoutButton
                      plan="starter"
                      variant={copy.highlighted ? 'default' : 'outline'}
                      className="w-full min-h-[44px] cursor-pointer cta-primary"
                    >
                      {copy.cta}
                    </PricingCheckoutButton>
                  </div>
                ) : (
                  <Button
                    className="mt-8 w-full cursor-pointer min-h-[44px] transition-interactive"
                    variant={copy.highlighted ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/sign-up">{copy.cta}</Link>
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
