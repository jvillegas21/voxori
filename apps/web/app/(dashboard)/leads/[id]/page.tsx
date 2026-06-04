'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';

const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'nurturing',
  'converted',
  'lost',
] as const;

interface LeadDetailPageProps {
  params: { id: string };
}

function formatBudget(min: number | null, max: number | null): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  if (max != null) return `Up to ${fmt(max)}`;
  return '—';
}

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const utils = trpc.useUtils();
  const { data: lead, isLoading, error } = trpc.leads.get.useQuery({ id: params.id });

  const updateStatus = trpc.leads.updateStatus.useMutation({
    onSuccess: () => {
      void utils.leads.get.invalidate({ id: params.id });
      void utils.leads.list.invalidate();
    },
  });

  if (isLoading) {
    return (
      <PageShell title="Lead" backHref="/leads">
        <Skeleton className="h-48 w-full rounded-xl" />
      </PageShell>
    );
  }

  if (error || !lead) {
    return (
      <PageShell title="Lead not found" backHref="/leads">
        <p className="text-muted-foreground">This lead may have been removed or you lack access.</p>
      </PageShell>
    );
  }

  return (
    <PageShell title={lead.name} backHref="/leads" description="Qualification details from voice agent.">
      <div className="max-w-xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="lead-status">Status</Label>
          <select
            id="lead-status"
            value={lead.status}
            disabled={updateStatus.isPending}
            onChange={(e) =>
              updateStatus.mutate({
                id: lead.id,
                status: e.target.value as (typeof LEAD_STATUSES)[number],
              })
            }
            className="flex h-11 min-h-[44px] w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
          {updateStatus.isError && (
            <p className="text-sm text-destructive">Could not update status. Try again.</p>
          )}
        </div>

        <dl className="grid gap-4 rounded-xl border bg-card p-6 text-sm">
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-medium">{lead.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{lead.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Budget</dt>
            <dd className="font-medium">{formatBudget(lead.budget_min, lead.budget_max)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Beds / Baths</dt>
            <dd className="font-medium">
              {lead.beds != null || lead.baths != null
                ? `${lead.beds ?? '—'} bed · ${lead.baths ?? '—'} bath`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Timeline</dt>
            <dd className="font-medium">{lead.timeline ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Financing</dt>
            <dd className="font-medium capitalize">{lead.financing_status?.replace('_', ' ') ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Area of interest</dt>
            <dd className="font-medium">{lead.area_of_interest ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">CRM sync</dt>
            <dd className="capitalize">{lead.crm_sync_state}</dd>
          </div>
          {lead.notes && (
            <div>
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="font-medium whitespace-pre-wrap">{lead.notes}</dd>
            </div>
          )}
          {lead.call_id && (
            <div>
              <dt className="text-muted-foreground">Source call</dt>
              <dd>
                <Link
                  href={`/calls/${lead.call_id}`}
                  className="cursor-pointer text-primary hover:underline"
                >
                  View call transcript
                </Link>
              </dd>
            </div>
          )}
        </dl>

        <Button variant="outline" className="cursor-pointer min-h-[44px]" asChild>
          <Link href="/leads">Back to leads</Link>
        </Button>
      </div>
    </PageShell>
  );
}
