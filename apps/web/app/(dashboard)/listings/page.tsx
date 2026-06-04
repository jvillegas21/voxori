'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type FilterValue = 'active' | 'pending' | 'sold' | null;
type SyncFeedback = { synced: number; message: string } | null;

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: null },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Sold', value: 'sold' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  sold: 'bg-gray-100 text-gray-600',
};

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatSource(originatingSystemName: string | null | undefined): string {
  switch (originatingSystemName) {
    case 'idx_broker':
      return 'IDX Broker';
    case 'unlock':
      return 'Bridge';
    case 'ctxmls':
      return 'Trestle';
    default:
      return originatingSystemName ?? '—';
  }
}

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${className}`}
    >
      {label}
    </span>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b last:border-0">
          {Array.from({ length: 9 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function ListingsPage() {
  const [filter, setFilter] = useState<FilterValue>(null);
  const [syncFeedback, setSyncFeedback] = useState<SyncFeedback>(null);
  const utils = trpc.useUtils();

  const { data: integrations } = trpc.integrations.list.useQuery();
  const mlsIntegration = integrations?.find((row) => row.type === 'mls');
  const mlsConnected = mlsIntegration?.connected ?? false;
  const lastSyncedAt = mlsIntegration?.lastSyncedAt ?? null;

  const {
    data: listings,
    isLoading,
    error,
    isFetching,
  } = trpc.listings.list.useQuery({ status: filter ?? undefined, limit: 50 });

  const syncListings = trpc.listings.sync.useMutation({
    onMutate: () => setSyncFeedback(null),
    onSuccess: async (result) => {
      setSyncFeedback({ synced: result.synced, message: result.message });
      await utils.listings.list.invalidate();
      await utils.integrations.list.invalidate();
    },
  });

  const hasListings = (listings?.length ?? 0) > 0;
  const syncError = syncListings.error?.message ?? null;
  const syncSucceededWithZero =
    syncFeedback !== null && syncFeedback.synced === 0 && !syncListings.isPending;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Listings</h1>
          <p className="mt-2 text-gray-500">
            View and manage your synced MLS/IDX property listings.
          </p>
          {mlsConnected && lastSyncedAt && (
            <p className="mt-1 text-xs text-gray-400">
              Last synced {formatDate(lastSyncedAt)}
            </p>
          )}
        </div>
        {mlsConnected && (
          <Button
            variant="outline"
            size="sm"
            disabled={syncListings.isPending || isFetching}
            onClick={() => syncListings.mutate()}
          >
            {syncListings.isPending ? 'Syncing…' : 'Sync now'}
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error.message}</p>}
      {syncError && <p className="mt-2 text-sm text-red-600">{syncError}</p>}
      {syncFeedback && syncFeedback.synced > 0 && (
        <p className="mt-2 text-sm text-green-700">{syncFeedback.message}</p>
      )}
      {syncSucceededWithZero && (
        <p className="mt-2 text-sm text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          {syncFeedback.message}
        </p>
      )}

      <div className="mt-6 flex gap-1 rounded-lg border bg-white p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Beds</th>
              <th className="px-4 py-3">Baths</th>
              <th className="px-4 py-3">Sqft</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">MLS ID</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Last Synced</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : !hasListings ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  {filter ? (
                    <p className="text-sm text-gray-400">No {filter} listings found.</p>
                  ) : !mlsConnected ? (
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-base font-medium text-gray-700">
                        No listings synced yet
                      </p>
                      <p className="text-sm text-gray-400 max-w-sm">
                        Connect an MLS/IDX integration to automatically sync your property
                        listings.
                      </p>
                      <Link
                        href="/integrations"
                        className="mt-1 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                      >
                        Connect Integration &rarr;
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-base font-medium text-gray-700">
                        {syncListings.isPending || isFetching
                          ? 'Syncing listings from IDX…'
                          : syncSucceededWithZero
                            ? '0 listings synced'
                            : 'No listings in cache yet'}
                      </p>
                      <p className="text-sm text-gray-400 max-w-md">
                        {syncSucceededWithZero
                          ? 'IDX returned no featured listings for this account. Add featured listings in IDX Broker, verify your API key, or reconnect MLS on the Integrations page.'
                          : 'Your MLS integration is connected. Listings sync in the background after connect — if nothing appears after a minute, run a manual sync or confirm your IDX account has featured listings.'}
                      </p>
                      <Button
                        size="sm"
                        disabled={syncListings.isPending}
                        onClick={() => syncListings.mutate()}
                      >
                        {syncListings.isPending ? 'Syncing…' : 'Sync now'}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              listings!.map((listing) => (
                <tr
                  key={listing.id}
                  className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-700 font-medium">{listing.address}</td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">
                    {formatPrice(listing.price)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">
                    {listing.bedrooms ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">
                    {listing.bathrooms ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums">
                    {listing.sqft != null ? listing.sqft.toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={listing.status}
                      className={STATUS_BADGE[listing.status] ?? 'bg-gray-100 text-gray-600'}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {listing.mls_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatSource(listing.originating_system_name)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatDate(listing.synced_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
