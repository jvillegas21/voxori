'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Database } from '@voxori/database/types';

type IntegrationType = Database['public']['Enums']['integration_type'];

interface WebhookLog {
  id: string;
  integration_type: string;
  event_type: string;
  status: string;
  created_at: string;
  error_message: string | null;
}

const INTEGRATIONS: {
  apiType: 'mls' | 'crm' | 'calendar';
  dbType: IntegrationType;
  name: string;
  description: string;
  icon: string;
}[] = [
  {
    apiType: 'calendar',
    dbType: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync availability and book showings automatically',
    icon: '📅',
  },
  {
    apiType: 'mls',
    dbType: 'mls_idx',
    name: 'IDX Broker / MLS',
    description: 'Connect your IDX Broker API key for live listing search on calls',
    icon: '🏠',
  },
  {
    apiType: 'crm',
    dbType: 'crm',
    name: 'Follow Up Boss',
    description: 'Log qualified leads to Follow Up Boss automatically',
    icon: '👥',
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

function formatConnectError(message: string): string {
  if (
    message.includes('CREDENTIALS_ENCRYPTION_KEY') ||
    message.includes('INTERNAL_API_SECRET')
  ) {
    return 'Credential encryption is not configured on the API. Set CREDENTIALS_ENCRYPTION_KEY (or INTERNAL_API_SECRET) in apps/api/.env.local.';
  }
  if (message.includes('GOOGLE_CLIENT_ID') || message.includes('OAuth is not configured')) {
    return 'Google Calendar OAuth is not configured on the API. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in apps/api/.env.local.';
  }
  if (message.includes('market_id') && message.includes('does not exist')) {
    return 'Database migration required: run pnpm db:migrate (dual MLS support adds integrations.market_id).';
  }
  return message;
}

function isIdxBrokerMarket(
  marketId: string,
  provider: string | undefined
): boolean {
  return provider === 'idx_broker' || marketId === 'idx_broker_primary';
}

function formatLastSynced(ts: string | null | undefined): string {
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
    </div>
  );
}

function IntegrationCard({
  integration,
  connected,
  lastSyncedAt,
  mlsMarkets,
  mlsMarketsLoading,
  mlsFeeds,
  onConnect,
  onDisconnect,
  isPending,
  connectError,
}: {
  integration: (typeof INTEGRATIONS)[number];
  connected: boolean;
  lastSyncedAt?: string | null;
  mlsMarkets?: Array<{ id: string; displayName: string; provider: string }>;
  mlsMarketsLoading?: boolean;
  mlsFeeds?: Array<{ marketId: string; displayName: string; provider: string }>;
  onConnect: (options?: { credentials?: Record<string, string>; marketId?: string }) => void;
  onDisconnect: () => void;
  isPending: boolean;
  connectError?: string | null;
}) {
  const [apiKey, setApiKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isReplacingCrmKey, setIsReplacingCrmKey] = useState(false);
  const [marketId, setMarketId] = useState('idx_broker_primary');
  const selectedMarket = mlsMarkets?.find((m) => m.id === marketId);
  const isIdxMarket = isIdxBrokerMarket(marketId, selectedMarket?.provider);
  const showCrmKeyForm =
    integration.apiType === 'crm' && (!connected || isReplacingCrmKey);

  useEffect(() => {
    if (connected) {
      setApiKey('');
      setAccountId('');
      setIsReplacingCrmKey(false);
    }
  }, [connected]);

  useEffect(() => {
    if (!mlsMarkets?.length) return;
    if (!mlsMarkets.some((market) => market.id === marketId)) {
      setMarketId(mlsMarkets[0]!.id);
    }
  }, [mlsMarkets, marketId]);

  return (
    <div className="rounded-lg border bg-white p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-50 text-xl border">
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{integration.name}</p>
          <p className="text-sm text-gray-500 mt-0.5">{integration.description}</p>
        </div>
      </div>

      {integration.apiType === 'mls' && !connected && (mlsMarkets || isIdxMarket) && (
        <div className="space-y-3">
          {mlsMarkets ? (
            <div className="space-y-1.5">
              <Label htmlFor="mls-market">Market / feed</Label>
              <select
                id="mls-market"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
              >
                {mlsMarkets.map((market) => (
                  <option key={market.id} value={market.id}>
                    {market.displayName}
                  </option>
                ))}
              </select>
            </div>
          ) : mlsMarketsLoading ? (
            <p className="text-xs text-gray-500">Loading MLS markets…</p>
          ) : null}
          {isIdxMarket ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="idx-api-key">IDX Broker API key</Label>
                <Input
                  id="idx-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="22-character access key from IDX Control Panel"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="idx-account-id">Account ID (optional)</Label>
                <Input
                  id="idx-account-id"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="IDX client account ID (partner dashboards)"
                />
              </div>
              <p className="text-xs text-gray-500">
                Generate keys under Home → Access Control in your IDX Broker account. Leave blank to
                use the platform IDX key when configured on the API.
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-500">
              Legacy Bridge/Trestle feeds use platform credentials. Contact support to enable live
              RESO sync for this market.
            </p>
          )}
        </div>
      )}

      {connectError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {connectError}
        </p>
      )}

      {integration.apiType === 'crm' && connected && !isReplacingCrmKey && (
        <div className="rounded-md border border-green-100 bg-green-50/50 px-3 py-2 text-sm text-green-900">
          <p className="font-medium">API key saved</p>
          <p className="mt-0.5 text-xs text-green-800/80">
            Your Follow Up Boss key is stored encrypted. It is not shown again for security.
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="mt-1 h-auto p-0 text-green-800"
            onClick={() => setIsReplacingCrmKey(true)}
          >
            Replace API key
          </Button>
        </div>
      )}

      {showCrmKeyForm && (
        <div className="space-y-1.5">
          <Label htmlFor="fub-api-key">
            {connected ? 'New Follow Up Boss API key' : 'Follow Up Boss API key'}
          </Label>
          <Input
            id="fub-api-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste API key from FUB Admin → API"
          />
          <p className="text-xs text-gray-500">
            Generate under Admin → API in your Follow Up Boss account. Keys are encrypted at rest.
          </p>
          {connected && isReplacingCrmKey && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-gray-600"
              onClick={() => {
                setIsReplacingCrmKey(false);
                setApiKey('');
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {integration.apiType === 'mls' && connected && mlsFeeds && mlsFeeds.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-1">
          {mlsFeeds.map((feed) => (
            <li key={feed.marketId}>
              {feed.displayName}{' '}
              <span className="text-gray-400">({feed.provider})</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          {connected ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Connected
              </span>
              <span className="text-xs text-gray-400">{formatLastSynced(lastSyncedAt)}</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400">
              <span className="h-2 w-2 rounded-full bg-gray-300" />
              Not connected
            </span>
          )}
        </div>

        {connected && !(integration.apiType === 'crm' && isReplacingCrmKey) ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={onDisconnect}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disconnect'}
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={
              isPending ||
              (integration.apiType === 'crm' && !apiKey.trim()) ||
              (integration.apiType === 'mls' && (mlsMarketsLoading || (!isIdxMarket && !mlsMarkets)))
            }
            onClick={() => {
              if (integration.apiType === 'crm') {
                onConnect({ credentials: { api_key: apiKey.trim() } });
                return;
              }
              if (integration.apiType === 'mls') {
                onConnect({
                  marketId,
                  credentials: isIdxMarket
                    ? {
                        api_key: apiKey.trim(),
                        ...(accountId.trim() ? { account_id: accountId.trim() } : {}),
                      }
                    : undefined,
                });
                return;
              }
              onConnect();
            }}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : integration.apiType === 'crm' && connected ? (
              'Save new key'
            ) : (
              'Connect'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  const [logs, setLogs] = useState<WebhookLog[] | null>(null);
  const [logsLoading, setLogsLoading] = useState(true);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectErrorType, setConnectErrorType] = useState<
    'mls' | 'crm' | 'calendar' | null
  >(null);
  const [supabase] = useState(() => createClient());

  const utils = trpc.useUtils();
  const { data: integrations, isLoading } = trpc.integrations.list.useQuery();
  const { data: mlsMarkets, isLoading: mlsMarketsLoading } =
    trpc.integrations.listMlsMarkets.useQuery();

  const connectMutation = trpc.integrations.connect.useMutation({
    onMutate: () => {
      setConnectError(null);
      setConnectErrorType(null);
    },
    onSuccess: async (result) => {
      if ('oauthUrl' in result && result.oauthUrl) {
        window.location.href = result.oauthUrl;
        return;
      }
      await utils.integrations.list.invalidate();
      await utils.onboarding.getProgress.invalidate();
      await utils.listings.list.invalidate();
    },
    onError: (err, variables) => {
      setConnectError(formatConnectError(err.message));
      setConnectErrorType(variables.type);
    },
  });

  const disconnectMutation = trpc.integrations.disconnect.useMutation({
    onMutate: () => {
      setConnectError(null);
      setConnectErrorType(null);
    },
    onSuccess: () => utils.integrations.list.invalidate(),
    onError: (err, variables) => {
      setConnectError(formatConnectError(err.message));
      setConnectErrorType(variables.type);
    },
  });

  useEffect(() => {
    async function fetchLogs() {
      const { data } = await supabase
        .from('webhook_logs')
        .select('id, integration_type, event_type, status, created_at, error_message')
        .order('created_at', { ascending: false })
        .limit(10);
      setLogs((data as WebhookLog[]) ?? []);
      setLogsLoading(false);
    }
    fetchLogs().catch(console.error);
  }, [supabase]);

  const pendingType = connectMutation.isPending
    ? connectMutation.variables?.type
    : disconnectMutation.isPending
      ? disconnectMutation.variables?.type
      : null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="mt-2 text-gray-500">
        Connect Voxori to your calendar, MLS, and CRM tools.
      </p>
      {oauthError && (
        <p className="mt-2 text-sm text-red-600">Connection failed: {oauthError}</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : INTEGRATIONS.map((integration) => {
              const row = integrations?.find((i) => i.type === integration.apiType);
              return (
                <IntegrationCard
                  key={integration.apiType}
                  integration={integration}
                  connected={row?.connected ?? false}
                  lastSyncedAt={row?.lastSyncedAt}
                  mlsMarkets={mlsMarkets}
                  mlsMarketsLoading={mlsMarketsLoading}
                  mlsFeeds={
                    integration.apiType === 'mls'
                      ? (row as { feeds?: Array<{ marketId: string; displayName: string; provider: string }> })
                          ?.feeds
                      : undefined
                  }
                  isPending={pendingType === integration.apiType}
                  connectError={
                    connectErrorType === integration.apiType ? connectError : null
                  }
                  onConnect={({ credentials, marketId: selectedMarketId }) =>
                    connectMutation.mutate({
                      type: integration.apiType,
                      credentials,
                      marketId: selectedMarketId as
                        | 'idx_broker_primary'
                        | 'austin_central_texas'
                        | 'central_texas_ctx'
                        | undefined,
                    })
                  }
                  onDisconnect={() => disconnectMutation.mutate({ type: integration.apiType })}
                />
              );
            })}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Webhook Event Log</h2>
        <p className="mt-1 text-sm text-gray-500">
          Last 10 inbound webhook events for debugging.
        </p>

        <div className="mt-4 rounded-lg border bg-white overflow-hidden">
          {logsLoading ? (
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
