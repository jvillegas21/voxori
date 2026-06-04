'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Database } from '@voxori/database/types';

type Booking = {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  showing_address: string | null;
  scheduled_at: string;
  status: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
};

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateShort(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  );
}

function UpcomingSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-white p-5 space-y-3">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function SchedulePage() {
  const [upcoming, setUpcoming] = useState<Booking[] | null>(null);
  const [past, setPast] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() =>
    createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  useEffect(() => {
    async function fetchBookings() {
      const now = new Date().toISOString();

      const [upcomingResult, pastResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, contact_name, contact_phone, showing_address, scheduled_at, status')
          .gte('scheduled_at', now)
          .order('scheduled_at', { ascending: true })
          .limit(20),
        supabase
          .from('bookings')
          .select('id, contact_name, contact_phone, showing_address, scheduled_at, status')
          .lt('scheduled_at', now)
          .neq('status', 'cancelled')
          .order('scheduled_at', { ascending: false })
          .limit(5),
      ]);

      setUpcoming(upcomingResult.data ?? []);
      setPast(pastResult.data ?? []);
      setLoading(false);
    }

    fetchBookings().catch(err => {
      console.error(err);
      setError('Failed to load schedule data.');
    });
  }, [supabase]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="mt-2 text-gray-500">
          View upcoming and past showings booked by your agent.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Upcoming Bookings */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Upcoming Showings</h2>
        {loading ? (
          <UpcomingSkeletons />
        ) : !upcoming || upcoming.length === 0 ? (
          <div className="rounded-lg border bg-white px-6 py-12 text-center">
            <p className="text-sm text-gray-400">
              No upcoming showings. Your agent will schedule showings when callers request them.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((booking) => (
              <div key={booking.id} className="rounded-lg border bg-white p-5">
                <p className="text-lg font-semibold text-gray-900">
                  {formatDateTime(booking.scheduled_at)}
                </p>
                <p className="mt-1 font-medium text-gray-800">
                  {booking.showing_address ?? '—'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {booking.contact_name ?? '—'}
                  {booking.contact_phone ? ` · ${booking.contact_phone}` : ''}
                </p>
                <div className="mt-3">
                  <StatusBadge status={booking.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past Bookings */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Past Showings</h2>
        {loading ? (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  {['Date', 'Address', 'Contact', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !past || past.length === 0 ? (
          <div className="rounded-lg border bg-white px-6 py-8 text-center">
            <p className="text-sm text-gray-400">No past showings yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {past.map((booking) => (
                  <tr key={booking.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {formatDateShort(booking.scheduled_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {booking.showing_address ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span>{booking.contact_name ?? '—'}</span>
                      {booking.contact_phone && (
                        <span className="block text-xs text-gray-400">{booking.contact_phone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Calendar Integration Card */}
      <section>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold">Calendar Integration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your Google Calendar to sync showings and check availability automatically.
          </p>
          <Button className="mt-4 cursor-pointer min-h-[44px]" asChild>
            <Link href="/integrations">Connect Google Calendar</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
