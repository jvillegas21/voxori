'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type FilterStatus = 'completed' | 'missed' | 'failed' | undefined;

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: undefined },
  { label: 'Completed', value: 'completed' },
  { label: 'Missed', value: 'missed' },
  { label: 'Failed', value: 'failed' },
];

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  missed: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};

const OUTCOME_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  callback_requested: 'bg-purple-100 text-purple-700',
  unqualified: 'bg-gray-100 text-gray-600',
  info_only: 'bg-gray-100 text-gray-600',
};

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatTime(startedAt: string): string {
  return new Date(startedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b last:border-0">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function CallsPage() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(undefined);
  const [page, setPage] = useState(0);

  const { data: calls, isLoading } = trpc.calls.list.useQuery(
    { status: filterStatus, limit: 20, offset: page * 20 },
    { placeholderData: keepPreviousData }
  );

  const hasCalls = calls && calls.length > 0;
  const hasNextPage = calls && calls.length === 20;

  function handleFilterChange(value: FilterStatus) {
    setFilterStatus(value);
    setPage(0);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Call Log</h1>
      <p className="mt-2 text-gray-500">View your call history, transcripts, and recordings.</p>

      {/* Filter bar */}
      <div className="mt-6 flex gap-1 rounded-lg border bg-white p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => handleFilterChange(f.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              filterStatus === f.value
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mt-4 rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Caller Number</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Outcome</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : !hasCalls ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                  No calls yet. Once your agent handles its first call, it will appear here.
                </td>
              </tr>
            ) : (
              calls.map((call) => (
                <tr key={call.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatTime(call.started_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono">
                    {call.caller_number ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">
                    {formatDuration(call.duration_seconds)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={call.status}
                      className={STATUS_BADGE[call.status] ?? 'bg-gray-100 text-gray-600'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {call.outcome ? (
                      <Badge
                        label={call.outcome.replace('_', ' ')}
                        className={OUTCOME_BADGE[call.outcome] ?? 'bg-gray-100 text-gray-600'}
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/calls/${call.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(hasCalls || page > 0) && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNextPage}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
