'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Phone,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Circle,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed': return 'default';    // green via CSS vars
    case 'missed':    return 'secondary';  // yellow via CSS vars
    case 'failed':    return 'destructive';
    default:          return 'outline';
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'missed':    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'failed':    return 'bg-red-100 text-red-800 border-red-200';
    default:          return '';
  }
}

function outcomeClass(outcome: string | null | undefined): string {
  switch (outcome) {
    case 'scheduled':          return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'callback_requested': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'unqualified':        return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'info_only':          return 'bg-gray-100 text-gray-700 border-gray-200';
    default:                   return 'bg-gray-100 text-gray-500 border-gray-200';
  }
}

function outcomeLabel(outcome: string | null | undefined): string {
  switch (outcome) {
    case 'scheduled':          return 'Scheduled';
    case 'callback_requested': return 'Callback';
    case 'unqualified':        return 'Unqualified';
    case 'info_only':          return 'Info Only';
    default:                   return 'N/A';
  }
}

// ─── onboarding checklist ───────────────────────────────────────────────────

function OnboardingState() {
  const { data, isLoading } = trpc.onboarding.getProgress.useQuery();

  if (isLoading) {
    return <Skeleton className="mt-8 h-48 w-full max-w-lg" />;
  }

  const steps = data?.steps ?? [];

  return (
    <Card className="mt-8 max-w-lg card-lift">
      <CardHeader>
        <CardTitle className="text-xl">Welcome to Voxori</CardTitle>
        <p className="text-sm text-muted-foreground">
          {data
            ? `${data.completedCount} of ${data.totalSteps} setup steps complete`
            : 'Complete these steps to get started:'}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-3">
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <Link
                href={step.href}
                className={`flex items-center gap-1 text-sm ${
                  step.completed ? 'text-muted-foreground' : 'font-medium text-primary hover:underline'
                }`}
              >
                {step.label}
                {!step.completed && <ArrowRight className="h-3 w-3" />}
              </Link>
            </li>
          ))}
        </ul>
        {data && !data.isComplete && (
          <Button className="mt-4 cursor-pointer" asChild>
            <Link href="/onboarding">Continue setup</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveCallBanner() {
  const { data: activeCall } = trpc.calls.getActive.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!activeCall?.started_at) return;

    function tick() {
      if (!activeCall?.started_at) return;
      const seconds = Math.floor(
        (Date.now() - new Date(activeCall.started_at).getTime()) / 1000
      );
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeCall?.started_at]);

  if (!activeCall) return null;

  return (
    <div
      className="mt-6 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
        <div>
          <p className="font-semibold text-green-900">Agent on call</p>
          <p className="text-sm text-green-800">
            {activeCall.caller_number ?? 'Unknown caller'}
            {elapsed ? ` · ${elapsed}` : ''}
          </p>
        </div>
      </div>
      <Badge className="bg-green-600 text-white hover:bg-green-600">Live</Badge>
    </div>
  );
}

// ─── recent calls table ─────────────────────────────────────────────────────

type Call = {
  id: string;
  caller_number: string | null;
  duration_seconds: number | null;
  status: string;
  outcome: string | null;
  started_at: string | null;
};

function RecentCallsTable({ calls }: { calls: Call[] }) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent Calls</h2>
        <Link
          href="/calls"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View all calls <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Caller</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Duration</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {calls.map((call) => (
              <tr key={call.id} className="cursor-pointer transition-colors duration-200 hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground">
                  {call.started_at
                    ? formatDistanceToNow(new Date(call.started_at), { addSuffix: true })
                    : '—'}
                </td>
                <td className="px-4 py-3 font-medium">
                  {call.caller_number ?? 'Unknown'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {call.duration_seconds != null ? formatDuration(call.duration_seconds) : '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={statusClass(call.status)}
                  >
                    {call.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={outcomeClass(call.outcome)}
                  >
                    {outcomeLabel(call.outcome)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── KPI cards ──────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card className="card-lift transition-interactive">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: calls, isLoading: callsLoading } = trpc.calls.list.useQuery({ limit: 5 });
  const { data: summary, isLoading: summaryLoading } = trpc.analytics.getSummary.useQuery({
    days: 30,
  });
  const { data: onboarding } = trpc.onboarding.getProgress.useQuery();

  const kpiLoading = summaryLoading;
  const totalCalls = summary?.totalCalls ?? 0;
  const missedCalls = summary?.missedCalls ?? 0;
  const showingsBooked = summary?.showingsBooked ?? 0;
  const avgDuration = summary
    ? formatDuration(summary.avgDurationSeconds)
    : '0m 0s';

  const kpis = [
    { title: 'Total Calls (30d)', value: totalCalls, icon: <Phone className="h-4 w-4" /> },
    { title: 'Missed Calls', value: missedCalls, icon: <AlertCircle className="h-4 w-4" /> },
    { title: 'Showings Booked', value: showingsBooked, icon: <Calendar className="h-4 w-4" /> },
    { title: 'Avg Duration', value: avgDuration, icon: <Clock className="h-4 w-4" /> },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Your call activity at a glance.</p>

      <ActiveCallBanner />

      {/* KPI row */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} loading={kpiLoading} />
        ))}
      </div>

      {/* Body — onboarding or recent calls */}
      {!callsLoading && calls !== undefined && (
        onboarding && !onboarding.isComplete ? (
          <OnboardingState />
        ) : calls.length === 0 ? (
          <OnboardingState />
        ) : (
          <RecentCallsTable calls={calls} />
        )
      )}
    </div>
  );
}
