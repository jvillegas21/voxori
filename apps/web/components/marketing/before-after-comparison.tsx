'use client';

import { useState } from 'react';
import { PhoneOff, PhoneIncoming, Voicemail, CalendarCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RevealOnScroll } from '@/components/marketing/motion';

interface ComparisonCardProps {
  variant: 'before' | 'after';
  title: string;
  outcome: string;
  items: { icon: typeof PhoneOff; label: string }[];
  hiddenOnMobile?: boolean;
}

function ComparisonCard({ variant, title, outcome, items, hiddenOnMobile }: ComparisonCardProps) {
  const isAfter = variant === 'after';

  return (
    <article
      className={cn(
        'card-lift rounded-2xl border p-6 md:p-8',
        hiddenOnMobile && 'hidden lg:block',
        isAfter
          ? 'border-primary/30 bg-card shadow-md ring-1 ring-primary/10'
          : 'border-border/60 bg-muted/30'
      )}
    >
      <p
        className={cn(
          'text-xs font-medium uppercase tracking-widest',
          isAfter ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {title}
      </p>
      <p className="mt-3 font-heading text-xl font-semibold text-foreground md:text-2xl">
        {outcome}
      </p>
      <ul className="mt-6 space-y-4">
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-start gap-3 text-sm text-muted-foreground">
            <Icon
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0 transition-colors duration-200',
                isAfter ? 'text-primary' : 'text-muted-foreground/70'
              )}
              aria-hidden
            />
            {label}
          </li>
        ))}
      </ul>
    </article>
  );
}

const BEFORE_ITEMS = [
  { icon: PhoneOff, label: 'Buyer calls after hours — no answer' },
  { icon: Voicemail, label: 'Leaves a message you return tomorrow' },
  { icon: PhoneOff, label: 'Lead goes cold or calls another agent' },
] as const;

const AFTER_ITEMS = [
  { icon: PhoneIncoming, label: 'AI picks up in under 2 seconds, 24/7' },
  { icon: PhoneIncoming, label: 'Qualifies budget, timeline, and financing' },
  { icon: CalendarCheck, label: 'MLS match + showing on your calendar' },
] as const;

export function BeforeAfterComparison() {
  const [mobileView, setMobileView] = useState<'before' | 'after'>('after');

  return (
    <section
      id="before-after"
      className="scroll-mt-24 border-y border-border/60 bg-muted/15 py-16 md:py-24"
      aria-labelledby="before-after-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <RevealOnScroll>
          <div className="max-w-2xl">
            <h2 id="before-after-heading" className="font-heading text-3xl font-semibold text-foreground">
              The difference is immediate
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every missed call is a buyer your competitor might book. Voxori turns inbound calls into
              qualified showings while you&apos;re in showings, at closings, or off the clock.
            </p>
          </div>
        </RevealOnScroll>

        <div
          className="mt-8 flex gap-2 lg:hidden"
          role="tablist"
          aria-label="Compare before and after Voxori"
        >
          {(['before', 'after'] as const).map((view) => (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={mobileView === view}
              onClick={() => setMobileView(view)}
              className={cn(
                'flex-1 cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium transition-interactive min-h-[44px]',
                mobileView === view
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
            >
              {view === 'before' ? 'Before Voxori' : 'With Voxori'}
            </button>
          ))}
        </div>

        <div className="mt-6 lg:hidden">
          <div
            key={mobileView}
            className="animate-[fadeInPage_300ms_ease-out_forwards] motion-reduce:animate-none"
            role="tabpanel"
          >
            {mobileView === 'before' ? (
              <ComparisonCard
                variant="before"
                title="Before Voxori"
                outcome="Missed call → voicemail"
                items={[...BEFORE_ITEMS]}
              />
            ) : (
              <ComparisonCard
                variant="after"
                title="With Voxori"
                outcome="Answered → showing booked"
                items={[...AFTER_ITEMS]}
              />
            )}
          </div>
        </div>

        <div className="mt-12 hidden gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <RevealOnScroll index={0}>
            <ComparisonCard
              variant="before"
              title="Before Voxori"
              outcome="Missed call → voicemail"
              items={[...BEFORE_ITEMS]}
            />
          </RevealOnScroll>

          <RevealOnScroll index={1} className="flex items-center justify-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 transition-[box-shadow,transform] duration-200 hover:shadow-md motion-reduce:hover:shadow-none"
              aria-hidden
            >
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
          </RevealOnScroll>

          <RevealOnScroll index={2}>
            <ComparisonCard
              variant="after"
              title="With Voxori"
              outcome="Answered → showing booked"
              items={[...AFTER_ITEMS]}
            />
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
