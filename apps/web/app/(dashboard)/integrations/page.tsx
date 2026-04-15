'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import type { Database } from '@voxori/database/types';

type IntegrationType = Database['public']['Enums']['integration_type'];

interface ConnectedIntegration {
  type: IntegrationType;
  is_active: boolean;
  last_synced_at: string | null;
  config: Database['public']['Tables']['integrations']['Row']['config'];
}

interface WebhookLog {
  id: string;
  integration_type: string;
  event_type: string;
  status: string;
  created_at: string;
  error_message: string | null;
}

const INTEGRATIONS: {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
}[] = [
  {
    type: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync availability and book showings automatically',
    icon: '📅',
  },
  {
    type: 'mls_idx',
    name: 'MLS / IDX',
    description: 'Sync property listings from your MLS provider',
    icon: '🏠',
  },
  {
    type: 'crm',
    name: 'CRM',
    description: 'Log leads to Follow Up Boss, KW Command, or similar',
    icon: '👥',
  },
  {
    type: 'calendly',
    name: 'Calendly',
    description: 'Use Calendly for appointment scheduling',
    icon: '🗓️',
  },
];

const STATUS_BADGE: Record<string, string> = {
  received: 'bg-blue-100 text-blue-700',
  processed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatLastSynced(ts: string | null): string {
  if (!ts) return 'Never synced';
  return `Last synced ${formatTime(ts)}`;
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [connected, setConnected] = useState<ConnectedIntegration[] | null>(null);
  const [logs, setLogs] = useState<WebhookLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    async function fetchData() {
      const [integrationsResult, logsResult] = await Promise.all([
        supabase
          .from('integrations')
          .select('type, is_active, last_synced_at, config'),
        supabase
          .from('webhook_logs')
          .select('id, integration_type, event_type, status, created_at, error_message')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      setConnected((integrationsResult.data as ConnectedIntegration[]) ?? []);
      setLogs((logsResult.data as WebhookLog[]) ?? []);
      setLoading(false);
    }

    fetchData().catch(err => {
      console.error(err);
      setError('Failed to load integrations data.');
    });
  }, [supabase]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="mt-2 text-gray-500">
        Connect Voxori to your calendar, MLS, and CRM tools.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {/* Integration Cards Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : INTEGRATIONS.map((integration) => {
              const conn = connected?.find((c) => c.type === integration.type);
              const isConnected = !!conn;

              return (
                <div
                  key={integration.type}
                  className="rounded-lg border bg-white p-5 flex flex-col gap-3"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-50 text-xl border">
                      {integration.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{integration.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{integration.description}</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      {isConnected ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Connected
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatLastSynced(conn.last_synced_at)}
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400">
                          <span className="h-2 w-2 rounded-full bg-gray-300" />
                          Not connected
                        </span>
                      )}
                    </div>

                    <div title="Coming in Phase 2">
                      {isConnected ? (
                        <button
                          disabled
                          className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          disabled
                          className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Webhook Debug Log */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Webhook Event Log</h2>
        <p className="mt-1 text-sm text-gray-500">
          Last 10 inbound webhook events for debugging.
        </p>

        <div className="mt-4 rounded-lg border bg-white overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-400">
              No webhook events yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Integration</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap tabular-nums">
                      {formatTime(log.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 font-mono text-xs">
                      {log.integration_type}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 font-mono text-xs">
                      {log.event_type}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_BADGE[log.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                        title={log.error_message ?? undefined}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
