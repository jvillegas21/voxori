'use client';

import {
  Phone,
  ClipboardList,
  Search,
  CalendarCheck,
  MessageSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RevealOnScroll } from '@/components/marketing/motion';

interface WorkflowStepData {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const WORKFLOW_STEPS: WorkflowStepData[] = [
  {
    id: 'answer',
    icon: Phone,
    title: 'Answer',
    description:
      'Voxori picks up in under two seconds on your listing line — nights, weekends, and busy showing days included.',
  },
  {
    id: 'qualify',
    icon: ClipboardList,
    title: 'Qualify',
    description:
      'Natural conversation captures budget, timeline, financing, and must-haves — the same questions you would ask, without hold music.',
  },
  {
    id: 'search',
    icon: Search,
    title: 'Search',
    description:
      'Live MLS integration surfaces three to five listings that match criteria discussed on the call.',
  },
  {
    id: 'book',
    icon: CalendarCheck,
    title: 'Book',
    description:
      'Google Calendar sync respects your availability. The buyer leaves with a confirmed showing time.',
  },
  {
    id: 'follow-up',
    icon: MessageSquare,
    title: 'Follow-up',
    description:
      'Listing links and confirmations go out via SMS within sixty seconds. Lead data syncs to your CRM.',
  },
];

export function WorkflowTimeline() {
  return (
    <ol className="relative space-y-0" aria-label="Product workflow steps">
      {WORKFLOW_STEPS.map((step, index) => {
        const Icon = step.icon;
        const isLast = index === WORKFLOW_STEPS.length - 1;

        return (
          <li key={step.id}>
            <RevealOnScroll index={index}>
              <div
                id={step.id}
                className="scroll-mt-24 relative flex gap-4 pb-10 md:pb-12"
              >
                {!isLast && (
                  <div
                    className="absolute left-[21px] top-11 hidden h-[calc(100%-2.75rem)] w-0.5 bg-border md:block"
                    aria-hidden
                  />
                )}
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground transition-[box-shadow] duration-200 hover:shadow-md motion-reduce:hover:shadow-none"
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-1 font-heading text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </RevealOnScroll>
          </li>
        );
      })}
    </ol>
  );
}
