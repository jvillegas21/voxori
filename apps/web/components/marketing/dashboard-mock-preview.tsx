import {
  Phone,
  User,
  Building2,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RevealOnScroll } from '@/components/marketing/motion';

const WORKFLOW_TRACE = [
  'Call answered',
  'Lead qualified',
  '3 listings matched',
  'Showing booked',
  'CRM + SMS sent',
] as const;

export function DashboardMockPreview({ className }: { className?: string }) {
  return (
    <RevealOnScroll className={cn('w-full', className)}>
      <div
        className="flex aspect-[16/10] flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg card-lift"
        role="img"
        aria-labelledby="dashboard-mock-caption"
      >
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-secondary/50" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/40" />
          </div>
          <div className="mx-auto flex min-h-[28px] flex-1 max-w-[240px] items-center justify-center rounded-md bg-background/80 px-3 text-xs text-muted-foreground">
            app.voxori.com/calls
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-2">
            <span className="font-heading text-sm font-semibold text-foreground">Calls</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live
            </span>
          </div>

          <div className="grid flex-1 gap-3 overflow-hidden p-3 sm:grid-cols-2">
            <article className="rounded-lg border border-border/60 bg-background p-3">
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    New lead
                  </p>
                  <p className="text-sm font-medium text-foreground">Sarah Chen</p>
                  <p className="text-xs text-muted-foreground">$650k · 60–90 days</p>
                </div>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-primary" aria-hidden />
                Inbound · 4:32
              </p>
            </article>

            <article className="rounded-lg border border-border/60 bg-background p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                MLS matches
              </p>
              <ul className="mt-2 space-y-1">
                {['1842 Oak Ln', '902 Maple Dr', '55 River View'].map((listing) => (
                  <li key={listing} className="flex items-center gap-1.5 text-xs text-foreground">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-secondary" aria-hidden />
                    {listing}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="border-t border-border/60 bg-muted/15 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Workflow
            </p>
            <ol className="mt-1.5 flex flex-wrap gap-1">
              {WORKFLOW_TRACE.map((label) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1 rounded border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] text-foreground"
                >
                  <CheckCircle2 className="h-3 w-3 text-primary" aria-hidden />
                  {label}
                </li>
              ))}
            </ol>
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <MessageSquare className="h-3 w-3 text-primary" aria-hidden />
              SMS + CRM synced
            </p>
          </div>
        </div>
      </div>
      <figcaption id="dashboard-mock-caption" className="sr-only">
        Mock preview of the Voxori calls dashboard with a live call, lead qualification, MLS
        matches, and workflow trace.
      </figcaption>
    </RevealOnScroll>
  );
}
