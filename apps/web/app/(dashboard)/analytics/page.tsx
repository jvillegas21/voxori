'use client';

import { trpc } from '@/lib/trpc';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function AnalyticsSkeleton() {
  return (
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
  );
}

export default function AnalyticsPage() {
  const { data: summary, isLoading } = trpc.analytics.getSummary.useQuery({ days: 30 });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Qualification, booking, and call performance over the last 30 days.
        </p>
        <div className="mt-6">
          <AnalyticsSkeleton />
        </div>
      </div>
    );
  }

  if (!summary || summary.totalCalls < 5) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Qualification, booking, and call performance over the last 30 days.
        </p>
        <div className="mt-6">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Not enough data yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You need at least 5 calls in the last 30 days to see analytics. Keep your agent
                active!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const outcomeEntries = Object.entries(summary.outcomeCounts).sort(([, a], [, b]) => b - a);
  const outcomeTotal = summary.totalCalls;

  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="mt-2 text-muted-foreground">
        Qualification, booking, and call performance over the last {summary.periodDays} days.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">Total calls</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalCalls}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">Qualification rate</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.qualificationRate}%</p>
            <p className="text-xs text-muted-foreground">{summary.totalLeads} leads captured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">Showing booking rate</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.showingBookingRate}%</p>
            <p className="text-xs text-muted-foreground">{summary.showingsBooked} showings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-muted-foreground">Avg duration</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summary.avgDurationSeconds > 0
                ? formatDuration(summary.avgDurationSeconds)
                : '—'}
            </p>
            <p className="text-xs text-muted-foreground">{summary.completionRate}% completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Call outcomes</CardTitle>
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
      </div>
    </div>
  );
}
