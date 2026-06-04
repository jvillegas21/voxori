'use client';

import Link from 'next/link';
import { Phone, Calendar, Building2, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { RevealOnScroll } from '@/components/marketing/motion';

const FEATURES = [
  {
    icon: Phone,
    title: 'Answers every call',
    description: 'Natural voice agent picks up in under 2 seconds, 24/7.',
  },
  {
    icon: Building2,
    title: 'Recommends listings',
    description: 'Live MLS search surfaces 3–5 matching properties during the call.',
  },
  {
    icon: Calendar,
    title: 'Books showings',
    description: 'Syncs with Google Calendar and respects your availability.',
  },
  {
    icon: MessageSquare,
    title: 'SMS follow-up',
    description: 'Listing links and confirmations sent within 60 seconds.',
  },
];

export function LandingPageContent() {
  return (
    <div className="flex min-h-screen flex-col bg-background fade-in-page">
      <MarketingHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <RevealOnScroll>
            <p className="text-sm font-medium uppercase tracking-widest text-secondary">
              AI Inside Sales Agent for Real Estate
            </p>
            <h1 className="font-heading mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
              Never miss a lead again.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Voxori answers every call, qualifies every buyer, recommends MLS listings, and books
              showings — for less than your morning coffee budget.
            </p>
          </RevealOnScroll>
          <RevealOnScroll index={1} className="mt-10 flex flex-wrap gap-4">
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
            <Button
              size="lg"
              variant="ghost"
              className="cursor-pointer min-h-[44px] transition-interactive"
              asChild
            >
              <Link href="/pricing">View pricing</Link>
            </Button>
          </RevealOnScroll>
        </section>

        <section className="border-t border-border/60 bg-muted/20 py-20">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }, index) => (
              <RevealOnScroll key={title} index={index}>
                <article className="card-lift h-full rounded-xl border border-border/60 bg-card p-6">
                  <Icon className="h-8 w-8 text-primary transition-opacity duration-200" aria-hidden />
                  <h2 className="mt-4 font-medium text-foreground">{title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <RevealOnScroll>
            <h2 className="font-heading text-3xl font-semibold text-foreground">
              From missed call to booked showing
            </h2>
            <p className="mt-4 max-w-lg text-muted-foreground">
              Agents using Voxori convert more inbound inquiries because every caller gets an instant,
              professional response.
            </p>
            <Button className="cta-primary mt-8 cursor-pointer min-h-[44px]" size="lg" asChild>
              <Link href="/waitlist">Join the waitlist</Link>
            </Button>
          </RevealOnScroll>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
