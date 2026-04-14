'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { trpc } from '@/lib/trpc';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PLAN_TIERS } from '@voxori/shared/constants';

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
};

type PhoneNumberRow = {
  id: string;
  number: string;
  is_active: boolean;
  agent_id: string | null;
  agents: { name: string } | { name: string }[] | null;
};

type ActiveTab = 'Team' | 'Billing' | 'Phone Numbers';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('Team');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberRow[]>([]);
  const [phoneNumbersLoading, setPhoneNumbersLoading] = useState(true);

  const { data: meData, isLoading: meLoading } = trpc.auth.me.useQuery();

  const createPortalSession = trpc.billing.createPortalSession.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
  });

  useEffect(() => {
    async function fetchUsers() {
      setUsersLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at');
      setUsers((data as UserRow[]) ?? []);
      setUsersLoading(false);
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    async function fetchPhoneNumbers() {
      setPhoneNumbersLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('phone_numbers')
        .select('id, number, is_active, agent_id, agents(name)')
        .order('number');
      setPhoneNumbers((data as PhoneNumberRow[]) ?? []);
      setPhoneNumbersLoading(false);
    }
    fetchPhoneNumbers();
  }, []);

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

      {/* Team Tab */}
      {activeTab === 'Team' && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Everyone who has access to this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No team members yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name ?? '—'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.role === 'client_admin' ? (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                              Admin
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100"
                            >
                              {user.role ? capitalize(user.role.replace('_', ' ')) : 'Member'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Phone Numbers Tab */}
      {activeTab === 'Phone Numbers' && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Phone Numbers</CardTitle>
              <CardDescription>
                Phone numbers assigned to your agents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {phoneNumbersLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : phoneNumbers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No phone numbers assigned yet. Contact support to assign a number to your agent.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phoneNumbers.map((pn) => {
                      const agentName = Array.isArray(pn.agents)
                        ? pn.agents[0]?.name
                        : (pn.agents as { name: string } | null)?.name;
                      return (
                        <TableRow key={pn.id}>
                          <TableCell className="font-mono">{pn.number}</TableCell>
                          <TableCell>{agentName ?? '—'}</TableCell>
                          <TableCell>
                            {pn.is_active ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100"
                              >
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current plan</p>
                      <p className="text-lg font-semibold">{planDisplayName}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => createPortalSession.mutate()}
                      disabled={createPortalSession.isPending || !meData?.tenant?.stripe_customer_id}
                      title={!meData?.tenant?.stripe_customer_id ? 'No Stripe account connected' : undefined}
                    >
                      {createPortalSession.isPending ? 'Redirecting...' : 'Manage Billing'}
                    </Button>
                  </div>

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
  if (confirming) {
    return (
      <button onClick={async () => {
        const session = await createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        ).auth.getSession();
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/gdpr/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({ confirmation: 'DELETE MY DATA' }),
        });
        window.location.href = '/sign-in';
      }} className="inline-flex h-9 items-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90">
        Confirm Delete Everything
      </button>
    );
  }
  return (
    <button onClick={() => setConfirming(true)}
      className="inline-flex h-9 items-center rounded-md border border-destructive px-4 text-sm font-medium text-destructive hover:bg-destructive/10">
      Delete my data
    </button>
  );
}
