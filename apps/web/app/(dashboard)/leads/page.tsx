'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function statusClass(status: string): string {
  switch (status) {
    case 'qualified':
      return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'converted':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'lost':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export default function LeadsPage() {
  const { data: leads, isLoading } = trpc.leads.list.useQuery({ limit: 50 });

  return (
    <PageShell
      title="Leads"
      description="Qualified contacts from your voice agent, ready for follow-up."
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : !leads?.length ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">No leads yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Leads appear here after your agent qualifies callers.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Area</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">CRM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {leads.map((lead) => (
                <tr key={lead.id} className="transition-colors duration-150 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="cursor-pointer font-medium text-primary hover:underline"
                    >
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {lead.area_of_interest ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusClass(lead.status)}>
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {lead.crm_sync_state}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
