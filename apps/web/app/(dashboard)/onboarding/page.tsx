'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { CheckCircle2, Circle, ArrowRight, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const STEP_CONTENT: Record<string, { title: string; description: string }> = {
  mls: {
    title: 'Connect your MLS',
    description: 'Add your IDX Broker API key so Voxori can search listings on calls.',
  },
  calendar: {
    title: 'Connect your calendar',
    description: 'Link Google Calendar to enable automatic showing bookings.',
  },
  crm: {
    title: 'Connect your CRM',
    description: 'Sync qualified leads to Follow Up Boss automatically.',
  },
  agent: {
    title: 'Configure your voice agent',
    description: 'Set agent name, voice, greeting, and compliance disclosures.',
  },
  number: {
    title: 'Get your phone number',
    description: 'Provision a local Twilio number or forward your existing line.',
  },
};

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
  return message;
}

function StepActions({ step }: { step: string }) {
  const utils = trpc.useUtils();
  const { data: mlsMarkets } = trpc.integrations.listMlsMarkets.useQuery(undefined, {
    enabled: step === 'mls',
  });

  const [connectError, setConnectError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [marketId, setMarketId] = useState('idx_broker_primary');

  const connectIntegration = trpc.integrations.connect.useMutation({
    onMutate: () => setConnectError(null),
    onSuccess: async (result) => {
      if ('oauthUrl' in result && result.oauthUrl) {
        window.location.href = result.oauthUrl;
        return;
      }
      setApiKey('');
      await utils.onboarding.getProgress.invalidate();
      await utils.integrations.list.invalidate();
    },
    onError: (err) => setConnectError(formatConnectError(err.message)),
  });

  const completeStep = trpc.onboarding.completeStep.useMutation({
    onSuccess: () => utils.onboarding.getProgress.invalidate(),
  });

  const isPending = connectIntegration.isPending || completeStep.isPending;
  const selectedMarket = mlsMarkets?.find((m) => m.id === marketId);
  const isIdxMarket =
    selectedMarket?.provider === 'idx_broker' || marketId === 'idx_broker_primary';

  if (step === 'mls') {
    return (
      <div className="flex w-full max-w-md flex-col gap-3">
        {mlsMarkets ? (
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-mls-market">Market / feed</Label>
            <select
              id="onboarding-mls-market"
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
        ) : isIdxMarket ? (
          <p className="text-xs text-muted-foreground">Loading MLS markets…</p>
        ) : null}
        {isIdxMarket ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-idx-key">IDX Broker API key</Label>
              <Input
                id="onboarding-idx-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Access key from IDX Control Panel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onboarding-idx-account">Account ID (optional)</Label>
              <Input
                id="onboarding-idx-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="IDX client account ID"
              />
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Legacy Bridge/Trestle feeds use platform credentials configured by your admin.
          </p>
        )}
        {connectError && <p className="text-sm text-destructive">{connectError}</p>}
        <Button
          className="cursor-pointer self-start"
          disabled={isPending || (isIdxMarket && !apiKey.trim())}
          onClick={() =>
            connectIntegration.mutate({
              type: 'mls',
              marketId: marketId as 'idx_broker_primary' | 'austin_central_texas' | 'central_texas_ctx',
              credentials: isIdxMarket
                ? {
                    api_key: apiKey.trim(),
                    ...(accountId.trim() ? { account_id: accountId.trim() } : {}),
                  }
                : undefined,
            })
          }
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Connect MLS
        </Button>
      </div>
    );
  }

  if (step === 'calendar') {
    return (
      <div className="flex w-full max-w-md flex-col gap-3">
        {connectError && <p className="text-sm text-destructive">{connectError}</p>}
        <Button
          className="cursor-pointer self-start"
          disabled={isPending}
          onClick={() => connectIntegration.mutate({ type: 'calendar' })}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Connect Google Calendar
        </Button>
      </div>
    );
  }

  if (step === 'crm') {
    return (
      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fub-api-key">Follow Up Boss API key</Label>
          <Input
            id="fub-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your FUB API key"
          />
        </div>
        {connectError && <p className="text-sm text-destructive">{connectError}</p>}
        <Button
          className="cursor-pointer self-start"
          disabled={isPending || !apiKey.trim()}
          onClick={() =>
            connectIntegration.mutate({ type: 'crm', credentials: { api_key: apiKey.trim() } })
          }
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Connect CRM
        </Button>
      </div>
    );
  }

  if (step === 'agent') {
    return (
      <Button className="cursor-pointer" asChild>
        <Link href="/agent">
          Configure agent
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
        </Link>
      </Button>
    );
  }

  if (step === 'number') {
    return (
      <div className="flex gap-3">
        <Button className="cursor-pointer" asChild>
          <Link href="/settings">Manage phone numbers</Link>
        </Button>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => completeStep.mutate({ step: 'number' })}
        >
          Mark complete
        </Button>
      </div>
    );
  }

  return null;
}

function OnboardingContent() {
  const searchParams = useSearchParams();
  const activeStep = searchParams.get('step') ?? 'mls';
  const oauthError = searchParams.get('error');
  const oauthConnected = searchParams.get('connected') === '1';

  const { data, isLoading, refetch } = trpc.onboarding.getProgress.useQuery();
  const stepInfo = STEP_CONTENT[activeStep] ?? STEP_CONTENT.mls!;
  const currentStep = data?.steps.find((s) => s.id === activeStep);

  useEffect(() => {
    if (oauthConnected) {
      void refetch();
    }
  }, [oauthConnected, refetch]);

  return (
    <PageShell
      title="Get started with Voxori"
      description="Complete these steps to answer your first call in under 15 minutes."
    >
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setup progress</CardTitle>
            {data && (
              <p className="text-sm text-muted-foreground">
                {data.completedCount} of {data.totalSteps} complete
              </p>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {data?.steps.map((step) => {
                  const isActive = step.id === activeStep;
                  return (
                    <li key={step.id}>
                      <Link
                        href={step.href}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        {step.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {oauthConnected && activeStep === 'calendar' && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Google Calendar connected successfully.
            </p>
          )}
          {oauthError && activeStep === 'calendar' && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Calendar connection failed: {decodeURIComponent(oauthError)}
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{stepInfo.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{stepInfo.description}</p>
            </CardHeader>
            <CardContent>
              {currentStep?.completed ? (
                <p className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  This step is complete.
                </p>
              ) : (
                <StepActions step={activeStep} />
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            {!currentStep?.completed && activeStep !== 'agent' && activeStep !== 'number' ? (
              <Button variant="outline" className="cursor-pointer" asChild>
                <Link href="/agent">
                  Skip for now
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            ) : null}
            {data?.isComplete && (
              <Button className="cursor-pointer" asChild>
                <Link href="/">Go to dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <OnboardingContent />
    </Suspense>
  );
}
