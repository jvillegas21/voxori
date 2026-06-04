import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MarketingPageShell,
  MarketingHero,
} from '@/components/marketing/marketing-page-shell';
import { BeforeAfterComparison } from '@/components/marketing/before-after-comparison';
import { WorkflowTimeline } from '@/components/marketing/workflow-timeline';
import { DashboardMockPreview } from '@/components/marketing/dashboard-mock-preview';
import { HowItWorksAnchorNav } from '@/components/marketing/how-it-works-anchor-nav';
import { IntegrationsRow } from '@/components/marketing/integrations-row';

export const metadata: Metadata = {
  title: 'How Voxori Works — From Call to Booked Showing',
  description:
    'See the Voxori agentic workflow: answer calls, qualify buyers, search MLS, book showings on Google Calendar, sync CRM, and review leads on your dashboard.',
};

export default function HowItWorksPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Product tour"
        title="From ring to booked showing in one agentic flow"
        description="Follow a buyer call through qualification, MLS recommendations, calendar booking, CRM sync, and your dashboard — the full inside-sales loop, 24/7."
      >
        <Button
          size="lg"
          className="cta-primary cursor-pointer min-h-[44px]"
          asChild
        >
          <Link href="/sign-up">
            Start free trial
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="cta-primary cursor-pointer min-h-[44px]"
          asChild
        >
          <Link href="/pricing">View pricing</Link>
        </Button>
      </MarketingHero>

      <div className="mx-auto max-w-6xl px-6 pb-8">
        <HowItWorksAnchorNav />
      </div>

      <BeforeAfterComparison />

      <section
        id="workflow"
        className="scroll-mt-24 mx-auto max-w-6xl px-6 py-16 md:py-24"
        aria-labelledby="workflow-heading"
      >
        <h2 id="workflow-heading" className="font-heading text-3xl font-semibold text-foreground">
          Five steps, zero voicemail
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Voxori runs an agentic workflow on every inbound call — answer, qualify, search, book, and
          follow up while the conversation stays natural.
        </p>
        <div className="mt-12 max-w-2xl">
          <WorkflowTimeline />
        </div>
      </section>

      <section
        id="dashboard"
        className="scroll-mt-24 border-t border-border/60 bg-muted/15 py-16 md:py-24"
        aria-labelledby="dashboard-heading"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 id="dashboard-heading" className="font-heading text-3xl font-semibold text-foreground">
                Your command center after every call
              </h2>
              <p className="mt-4 text-muted-foreground">
                Transcripts, qualification fields, matched listings, and workflow traces land on
                your dashboard in real time — so your follow-up starts informed, not from a
                scribbled note.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li>Live call indicator when Voxori is on the line</li>
                <li>Lead card with budget, timeline, and financing</li>
                <li>MLS recommendations surfaced during the call</li>
                <li>Full workflow trace for compliance and coaching</li>
              </ul>
            </div>
            <DashboardMockPreview />
          </div>
        </div>
      </section>

      <IntegrationsRow />

      <section className="border-t border-border/60 bg-muted/15 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-heading text-3xl font-semibold text-foreground">
            See it on your listings
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Connect your number, sync calendar and MLS, and let Voxori handle the calls you can&apos;t
            get to.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              size="lg"
              className="cta-primary cursor-pointer min-h-[44px]"
              asChild
            >
              <Link href="/waitlist">Join the waitlist</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="cta-primary cursor-pointer min-h-[44px]"
              asChild
            >
              <Link href="/about">About Voxori</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
