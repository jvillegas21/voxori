'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ---------- helpers ----------

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function truncate(str: string, len = 12) {
  return str.length > len ? `${str.slice(0, len)}…` : str;
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'default';
  if (status === 'missed') return 'secondary';
  if (status === 'failed') return 'destructive';
  return 'outline';
}

function outcomeVariant(outcome: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    scheduled: 'default',
    callback_requested: 'secondary',
    info_only: 'outline',
    unqualified: 'destructive',
  };
  return map[outcome] ?? 'outline';
}

// ---------- skeleton ----------

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </CardContent>
      </Card>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-20 w-full" /></CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- recording player ----------

interface RecordingPlayerProps {
  callId: string;
  hasRecording: boolean;
}

function RecordingPlayer({ callId, hasRecording }: RecordingPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasRecording) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token ?? null;

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/recordings/${callId}`,
          {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          }
        );

        if (!res.ok) throw new Error(`Failed to fetch recording (${res.status})`);

        const json = await res.json();
        if (!cancelled) setSignedUrl(json.signedUrl as string);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [callId, hasRecording]);

  if (!hasRecording) {
    return <p className="text-sm text-muted-foreground">No recording for this call.</p>;
  }
  if (loading) {
    return <Skeleton className="h-12 w-full" />;
  }
  if (error) {
    return <p className="text-sm text-destructive">Error loading recording: {error}</p>;
  }
  if (!signedUrl) return null;

  return <audio controls src={signedUrl} className="w-full" />;
}

// ---------- tool event ----------

interface ToolEvent {
  id: string;
  tool_name: string;
  duration_ms: number | null;
  input: unknown;
  created_at: string;
}

function ToolEventRow({ event }: { event: ToolEvent }) {
  const [expanded, setExpanded] = useState(false);
  const inputStr = event.input != null ? JSON.stringify(event.input, null, 2) : '';
  const lines = inputStr.split('\n');
  const isLong = lines.length > 3;
  const displayStr = isLong && !expanded ? lines.slice(0, 3).join('\n') + '\n…' : inputStr;

  return (
    <div className="rounded-md border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{event.tool_name}</span>
        {event.duration_ms != null && (
          <Badge variant="outline" className="text-xs">{event.duration_ms}ms</Badge>
        )}
      </div>
      {inputStr && (
        <div>
          <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
            {displayStr}
          </pre>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs text-primary underline"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- main page ----------

export default function CallDetailPage() {
  const params = useParams<{ id: string }>();
  const callId = params.id;

  const { data: call, isLoading, error } = trpc.calls.get.useQuery({ id: callId });

  if (isLoading) return <PageSkeleton />;

  if (error || !call) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Call not found or you don&apos;t have access.</p>
        <Link href="/calls" className="text-primary underline text-sm">
          ← Back to calls
        </Link>
      </div>
    );
  }

  const toolEvents: ToolEvent[] = (call.call_tool_events ?? []) as ToolEvent[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/calls" className="text-sm text-muted-foreground hover:text-foreground">
          ← Calls
        </Link>
        <h1 className="text-xl font-bold font-mono" title={call.id}>
          {truncate(call.id, 16)}
        </h1>
        <Badge variant={statusVariant(call.status)}>{call.status}</Badge>
        {call.outcome && (
          <Badge variant={outcomeVariant(call.outcome)}>
            {call.outcome.replace('_', ' ')}
          </Badge>
        )}
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Started at</p>
            <p className="text-sm font-medium">{formatDateTime(call.started_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-sm font-medium">{formatDuration(call.duration_seconds)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Caller number</p>
            <p className="text-sm font-medium">{call.caller_number ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Agent ID</p>
            <p className="text-sm font-medium font-mono" title={call.agent_id}>
              {truncate(call.agent_id, 16)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {call.summary ? (
            <p className="text-sm leading-relaxed">{call.summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Summary not available.</p>
          )}
        </CardContent>
      </Card>

      {/* Recording */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recording</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordingPlayer callId={callId} hasRecording={call.recording_url != null} />
        </CardContent>
      </Card>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          {call.transcript ? (
            <pre className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {call.transcript}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">Transcript not yet available.</p>
          )}
        </CardContent>
      </Card>

      {/* Tool events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tool Events</CardTitle>
        </CardHeader>
        <CardContent>
          {toolEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tool events for this call.</p>
          ) : (
            <div className="space-y-3">
              {toolEvents.map((evt) => (
                <ToolEventRow key={evt.id} event={evt} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
