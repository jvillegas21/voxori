import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, Lightbulb, Shield, Users, Clock, Zap, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MarketingPageShell,
  MarketingHero,
} from '@/components/marketing/marketing-page-shell';

export const metadata: Metadata = {
  title: 'About Voxori — AI Inside Sales Agent for Real Estate',
  description:
    'Voxori is the agentic AI inside sales agent for residential real estate — answering every call, qualifying buyers, and booking showings with fair-housing-aware compliance.',
};

const VALUES = [
  {
    icon: Heart,
    title: 'Agents first',
    body: 'We build for the agent in the field — not generic call centers. Every workflow mirrors how top producers actually qualify and convert inbound buyers.',
  },
  {
    icon: Lightbulb,
    title: 'Agentic by design',
    body: 'MLS search, calendar booking, CRM sync, and SMS fire as tools during a single natural conversation — not a rigid phone tree.',
  },
  {
    icon: Shield,
    title: 'Trust at scale',
    body: 'Fair-housing guardrails, call recordings, and audit trails so brokerages can stand behind every automated interaction.',
  },
] as const;

const METRICS = [
  { icon: Zap, value: '<2s', label: 'Average answer time' },
  { icon: Clock, value: '24/7', label: 'Inbound coverage' },
  { icon: PhoneCall, value: '<60s', label: 'SMS follow-up after hang-up' },
] as const;

export default function AboutPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="About Voxori"
        title="The AI inside sales agent built for residential real estate"
        description="We combine voice AI, live MLS search, calendar booking, and CRM sync into one agentic workflow — so your business captures every lead your marketing generates."
      >
        <Button size="lg" className="cta-primary cursor-pointer min-h-[44px]" asChild>
          <Link href="/sign-up">
            Start 14-day free trial
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="cursor-pointer min-h-[44px] transition-interactive"
          asChild
        >
          <Link href="/how-it-works">See how it works</Link>
        </Button>
      </MarketingHero>

      <section
        className="border-y border-border/60 bg-muted/15 py-16 md:py-24"
        aria-labelledby="belief-heading"
      >
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="belief-heading" className="font-heading text-3xl font-semibold text-foreground">
            The problem we couldn&apos;t ignore
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Residential agents lose deals in voicemail — not because they don&apos;t care, but because
            they can&apos;t be on two phones at once during showings, closings, and family dinner.
          </p>
          <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
            We believe every inbound buyer deserves an instant, professional response — and every
            agent deserves an inside sales partner that qualifies seriously, recommends accurately,
            and books showings without sacrificing the human relationship you build at the door.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24" aria-labelledby="values-heading">
        <h2 id="values-heading" className="font-heading text-3xl font-semibold text-foreground">
          What guides us
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="card-lift rounded-2xl border border-border/60 bg-card p-6 md:p-8"
            >
              <Icon className="h-8 w-8 text-primary" aria-hidden />
              <h3 className="mt-4 font-heading text-xl font-semibold text-foreground">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="border-y border-border/60 bg-primary/5 py-12 md:py-16"
        aria-label="Key metrics"
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-3">
          {METRICS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="text-center sm:text-left">
              <Icon className="mx-auto h-7 w-7 text-primary sm:mx-0" aria-hidden />
              <p className="font-heading mt-3 text-3xl font-semibold text-foreground">{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24" aria-labelledby="team-heading">
        <h2 id="team-heading" className="font-heading text-3xl font-semibold text-foreground">
          Built with agents, for agents
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Our team includes product leaders from proptech and conversational AI, working alongside
          active brokers and top-producing agents who stress-test every workflow before it ships.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {['Product & AI', 'Broker partnerships', 'Customer success'].map((area) => (
            <div
              key={area}
              className="card-lift rounded-xl border border-border/60 bg-muted/20 px-6 py-8"
            >
              <Users className="h-6 w-6 text-primary" aria-hidden />
              <p className="mt-4 font-medium text-foreground">{area}</p>
              <p className="mt-2 text-sm text-muted-foreground">Growing team · hiring soon</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/15 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-heading text-3xl font-semibold text-foreground">
            Ready to stop losing leads?
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Join agents who answer every call with an AI partner that books showings while they&apos;re
            in the field.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              size="lg"
              className="cursor-pointer min-h-[44px] transition-interactive"
              asChild
            >
              <Link href="/waitlist">Join the waitlist</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="cursor-pointer min-h-[44px] transition-interactive"
              asChild
            >
              <Link href="/how-it-works">Tour the product</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
