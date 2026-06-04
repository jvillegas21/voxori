'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-teal-100 text-teal-800',
  cancelled: 'bg-slate-100 text-slate-600',
  completed: 'bg-blue-100 text-blue-800',
};

export default function ShowingsPage() {
  const utils = trpc.useUtils();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { data: showings, isLoading } = trpc.showings.list.useQuery({ limit: 50 });

  const cancelShowing = trpc.showings.cancel.useMutation({
    onSuccess: () => {
      void utils.showings.list.invalidate();
      setCancellingId(null);
    },
    onError: () => setCancellingId(null),
  });

  function handleCancel(id: string, label: string) {
    if (!window.confirm(`Cancel showing for ${label}?`)) return;
    setCancellingId(id);
    cancelShowing.mutate({ id });
  }

  return (
    <PageShell
      title="Showings"
      description="Appointments booked by your AI agent during live calls."
      actions={
        <Link
          href="/schedule"
          className="cursor-pointer text-sm text-primary transition-colors duration-200 hover:underline"
        >
          Calendar view →
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !showings?.length ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">No showings scheduled yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When callers book during a call, appointments appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {showings.map((showing) => (
            <li
              key={showing.id}
              className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-shadow duration-200 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{showing.contact_name ?? 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">{showing.showing_address}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(showing.scheduled_at)}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    STATUS_STYLES[showing.status] ?? STATUS_STYLES.pending
                  }`}
                >
                  {showing.status}
                </span>
                {showing.status !== 'cancelled' && showing.status !== 'completed' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer min-h-[44px]"
                    disabled={cancellingId === showing.id}
                    onClick={() =>
                      handleCancel(showing.id, showing.contact_name ?? 'this contact')
                    }
                  >
                    {cancellingId === showing.id ? 'Cancelling…' : 'Cancel'}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
