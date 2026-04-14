'use client';

import { trpc } from '@/lib/trpc';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function getDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// ─── skeleton ───────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: calls, isLoading } = trpc.calls.list.useQuery({ limit: 100 });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Call outcome breakdown and conversion metrics.
        </p>
        <div className="mt-6">
          <AnalyticsSkeleton />
        </div>
      </div>
    );
  }

  const allCalls = calls ?? [];

  // ── insufficient data ────────────────────────────────────────────────────
  if (allCalls.length < 5) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Call outcome breakdown and conversion metrics.
        </p>
        <div className="mt-6">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Not enough data yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You need at least 5 calls to see analytics. Keep your agent
                active!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── KPI: last-30-days slice ──────────────────────────────────────────────
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentCalls = allCalls.filter(
    (c) => new Date(c.started_at) >= thirtyDaysAgo,
  );

  const totalCalls = recentCalls.length;

  const completedCalls = recentCalls.filter((c) => c.status === 'completed');
  const completionRate =
    totalCalls > 0
      ? Math.round((completedCalls.length / totalCalls) * 100)
      : 0;

  const callsWithDuration = recentCalls.filter(
    (c) => c.duration_seconds != null,
  );
  const avgDurationSeconds =
    callsWithDuration.length > 0
      ? Math.round(
          callsWithDuration.reduce(
            (sum, c) => sum + (c.duration_seconds ?? 0),
            0,
          ) / callsWithDuration.length,
        )
      : 0;

  const showingsBooked = recentCalls.filter(
    (c) => c.outcome === 'scheduled',
  ).length;

  // ── outcome breakdown (all fetched calls) ───────────────────────────────
  const outcomeCounts: Record<string, number> = {};
  for (const c of allCalls) {
    const key = c.outcome ?? 'unknown';
    outcomeCounts[key] = (outcomeCounts[key] ?? 0) + 1;
  }
  const outcomeTotal = allCalls.length;
  const outcomeEntries = Object.entries(outcomeCounts).sort(
    ([, a], [, b]) => b - a,
  );

  // ── call volume — last 7 days ────────────────────────────────────────────
  const days: { label: string; date: Date; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push({ label: getDayLabel(d), date: startOfDay(d), count: 0 });
  }

  for (const c of allCalls) {
    const callDay = startOfDay(new Date(c.started_at));
    const entry = days.find((d) => d.date.getTime() === callDay.getTime());
    if (entry) entry.count++;
  }

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="mt-2 text-muted-foreground">
        Call outcome breakdown and conversion metrics.
      </p>

      {/* Section 1 — KPI cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Total Calls (30d)
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCalls}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{completionRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Avg Duration
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {avgDurationSeconds > 0
                ? formatDuration(avgDurationSeconds)
                : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Showings Booked
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{showingsBooked}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sections 2 & 3 */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Section 2 — Outcome breakdown */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Call Outcomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outcomeEntries.map(([outcome, count]) => (
              <div key={outcome} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-right text-sm text-muted-foreground">
                  {outcome}
                </span>
                <div
                  className="h-5 rounded bg-primary"
                  style={{
                    width: `${(count / outcomeTotal) * 100}%`,
                    minWidth: '2px',
                  }}
                />
                <span className="text-sm">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section 3 — Volume last 7 days */}
        <Card>
          <CardHeader>
            <CardTitle>Volume by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end justify-around gap-1">
              {days.map((day) => (
                <div
                  key={day.label + day.date.getTime()}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="text-xs">{day.count > 0 ? day.count : ''}</span>
                  <div
                    className="w-8 rounded-t bg-primary"
                    style={{
                      height: `${(day.count / maxCount) * 80}px`,
                      minHeight: day.count > 0 ? '4px' : '0',
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
