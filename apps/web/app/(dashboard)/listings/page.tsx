'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Skeleton } from '@/components/ui/skeleton';
import type { Database } from '@voxori/database/types';

type Listing = Pick<
  Database['public']['Tables']['listings']['Row'],
  'id' | 'address' | 'price' | 'bedrooms' | 'bathrooms' | 'sqft' | 'status' | 'mls_id' | 'created_at'
>;

type FilterValue = 'active' | 'pending' | 'sold' | null;

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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
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

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${className}`}>
      {label}
    </span>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b last:border-0">
          {Array.from({ length: 8 }).map((_, j) => (
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
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setIsLoading(true);
    let query = supabase
      .from('listings')
      .select('id, address, price, bedrooms, bathrooms, sqft, status, mls_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (filter) query = query.eq('status', filter);

    query.then(({ data }) => {
      setListings(data ?? []);
      setIsLoading(false);
    });
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasListings = listings.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">Listings</h1>
      <p className="mt-2 text-gray-500">
        View and manage your synced MLS/IDX property listings.
      </p>

      {/* Filter tabs */}
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

      {/* Table */}
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
              <th className="px-4 py-3">Last Synced</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : !hasListings ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  {filter ? (
                    <p className="text-sm text-gray-400">
                      No {filter} listings found.
                    </p>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-base font-medium text-gray-700">
                        No listings synced yet
                      </p>
                      <p className="text-sm text-gray-400 max-w-sm">
                        Connect an MLS/IDX integration to automatically sync your property listings.
                      </p>
                      <Link
                        href="/integrations"
                        className="mt-1 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                      >
                        Connect Integration &rarr;
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              listings.map((listing) => (
                <tr key={listing.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {listing.address}
                  </td>
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
                    <Badge
                      label={listing.status}
                      className={STATUS_BADGE[listing.status] ?? 'bg-gray-100 text-gray-600'}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {listing.mls_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatDate(listing.created_at)}
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
