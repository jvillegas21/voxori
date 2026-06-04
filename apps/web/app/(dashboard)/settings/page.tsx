'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PLAN_TIERS } from '@voxori/shared/constants';
import { PhoneNumbersTab } from '@/components/settings/phone-numbers-tab';
import { TeamTab } from '@/components/settings/team-tab';

type ActiveTab = 'Team' | 'Billing' | 'Phone Numbers';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('Team');

  const { data: meData, isLoading: meLoading } = trpc.auth.me.useQuery();
  const { data: usageSummary, isLoading: usageLoading } = trpc.billing.getUsageSummary.useQuery();

  const createPortalSession = trpc.billing.createPortalSession.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
  });

  const createCheckoutSession = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (err) => {
      alert(err.message);
    },
  });

  const plan = meData?.tenant?.plan ?? null;
  const planFeatures = plan && PLAN_TIERS[plan] ? PLAN_TIERS[plan] : null;
  const planDisplayName = planFeatures?.name ?? (plan ? capitalize(plan) : 'Unknown');

  function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-2 text-muted-foreground">
        Manage your team, billing, and account settings.
      </p>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b pb-0 mb-6 mt-6">
        {(['Team', 'Billing', 'Phone Numbers'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={
              activeTab === tab
                ? 'border-b-2 border-primary px-4 pb-2 text-sm font-medium'
                : 'px-4 pb-2 text-sm text-muted-foreground'
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Team' && <TeamTab />}

      {activeTab === 'Phone Numbers' && <PhoneNumbersTab />}

      {/* Billing Tab */}
      {activeTab === 'Billing' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing &amp; Plan</CardTitle>
              <CardDescription>
                Your current subscription and usage details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {meLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Current plan</p>
                      <p className="text-lg font-semibold">{planDisplayName}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="cursor-pointer min-h-[44px]"
                        onClick={() => createCheckoutSession.mutate({ plan: 'starter' })}
                        disabled={createCheckoutSession.isPending}
                      >
                        {createCheckoutSession.isPending ? 'Redirecting…' : 'Subscribe'}
                      </Button>
                      <Button
                        variant="outline"
                        className="cursor-pointer min-h-[44px]"
                        onClick={() => createPortalSession.mutate()}
                        disabled={createPortalSession.isPending || !meData?.tenant?.stripe_customer_id}
                        title={!meData?.tenant?.stripe_customer_id ? 'No Stripe account connected' : undefined}
                      >
                        {createPortalSession.isPending ? 'Redirecting…' : 'Manage Billing'}
                      </Button>
                    </div>
                  </div>

                  {!usageLoading && usageSummary?.usage && (
                    <div className="rounded-md border p-4 space-y-1">
                      <p className="text-sm font-medium">Usage this period</p>
                      <p className="text-2xl font-bold tabular-nums">
                        {usageSummary.usage.minutes_used ?? 0}{' '}
                        <span className="text-sm font-normal text-muted-foreground">minutes used</span>
                      </p>
                      {planFeatures && (
                        <p className="text-xs text-muted-foreground">
                          {planFeatures.includedMinutes.toLocaleString()} minutes included on{' '}
                          {planDisplayName}
                        </p>
                      )}
                    </div>
                  )}

                  {planFeatures && (
                    <div className="rounded-md border p-4 space-y-2">
                      <p className="text-sm font-medium">Plan features</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                          <span className="font-medium text-foreground">
                            ${planFeatures.pricePerMonth}
                          </span>{' '}
                          / month
                        </li>
                        <li>
                          <span className="font-medium text-foreground">
                            {planFeatures.includedMinutes.toLocaleString()}
                          </span>{' '}
                          included minutes
                        </li>
                        <li>
                          Overage rate:{' '}
                          <span className="font-medium text-foreground">
                            ${planFeatures.overageRatePerMinute.toFixed(2)}
                          </span>{' '}
                          / min
                        </li>
                        <li>
                          Agents:{' '}
                          <span className="font-medium text-foreground">
                            {planFeatures.maxAgents === 'unlimited'
                              ? 'Unlimited'
                              : planFeatures.maxAgents}
                          </span>
                        </li>
                        {planFeatures.voiceCloning && (
                          <li className="text-green-700">Voice cloning included</li>
                        )}
                        {planFeatures.mlsIntegration && (
                          <li className="text-green-700">MLS integration included</li>
                        )}
                        {planFeatures.crmSync && (
                          <li className="text-green-700">CRM sync included</li>
                        )}
                        {planFeatures.mfa && (
                          <li className="text-green-700">MFA included</li>
                        )}
                        <li>
                          Call recording retention:{' '}
                          <span className="font-medium text-foreground">
                            {planFeatures.callRecordingRetentionDays === 'unlimited'
                              ? 'Unlimited'
                              : `${planFeatures.callRecordingRetentionDays} days`}
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data & Privacy */}
      <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="font-semibold text-destructive">Data &amp; Privacy</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your data under GDPR.</p>
        <div className="mt-4 flex gap-3">
          <a
            href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/export`}
            className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent"
            download
          >
            Export my data
          </a>
          <DataDeleteButton />
        </div>
      </div>
    </div>
  );
}

function DataDeleteButton() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data: { session } } = await createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ).auth.getSession();
      if (!session?.access_token) { setDeleteError('Not authenticated.'); return; }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ confirmation: 'DELETE MY DATA' }),
      });
      if (!res.ok) { setDeleteError('Deletion failed. Please try again.'); return; }
      window.location.href = '/sign-in';
    } catch { setDeleteError('An unexpected error occurred.'); }
    finally { setDeleting(false); }
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex h-9 items-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? 'Deleting...' : 'Confirm Delete Everything'}
        </button>
        {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
      </div>
    );
  }
  return (
    <button onClick={() => setConfirming(true)}
      className="inline-flex h-9 items-center rounded-md border border-destructive px-4 text-sm font-medium text-destructive hover:bg-destructive/10">
      Delete my data
    </button>
  );
}
