'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

function formatRole(role: string) {
  if (role === 'client_admin') return 'Admin';
  if (role === 'team_member') return 'Member';
  return role.replace(/_/g, ' ');
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function TeamTab() {
  const utils = trpc.useUtils();
  const { data: meData } = trpc.auth.me.useQuery();
  const isAdmin =
    meData?.user?.role === 'client_admin' || meData?.user?.role === 'super_admin';

  const { data: members, isLoading: membersLoading } = trpc.team.listMembers.useQuery();
  const { data: invites, isLoading: invitesLoading } = trpc.team.listInvites.useQuery(
    undefined,
    { enabled: isAdmin }
  );

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'team_member' | 'client_admin'>('team_member');
  const [formError, setFormError] = useState<string | null>(null);

  const inviteMutation = trpc.team.invite.useMutation({
    onSuccess: () => {
      void utils.team.listInvites.invalidate();
      setInviteEmail('');
      setFormError(null);
    },
    onError: (err) => setFormError(err.message),
  });

  const revokeMutation = trpc.team.revokeInvite.useMutation({
    onSuccess: () => void utils.team.listInvites.invalidate(),
  });

  const updateRoleMutation = trpc.team.updateRole.useMutation({
    onSuccess: () => void utils.team.listMembers.invalidate(),
  });

  const removeMutation = trpc.team.removeMember.useMutation({
    onSuccess: () => void utils.team.listMembers.invalidate(),
  });

  const currentUserId = meData?.user?.id;

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Everyone who has access to this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !members?.length ? (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name ?? '—'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.role === 'client_admin' ? (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{formatRole(user.role)}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.created_at)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {user.id !== currentUserId && (
                          <div className="flex justify-end gap-2">
                            <select
                              value={user.role}
                              onChange={(e) =>
                                updateRoleMutation.mutate({
                                  userId: user.id,
                                  role: e.target.value as 'client_admin' | 'team_member',
                                })
                              }
                              disabled={updateRoleMutation.isPending}
                              className="h-9 cursor-pointer rounded-md border border-input bg-background px-2 text-sm"
                              aria-label={`Change role for ${user.email}`}
                            >
                              <option value="team_member">Member</option>
                              <option value="client_admin">Admin</option>
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="cursor-pointer text-destructive"
                              disabled={removeMutation.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(`Remove ${user.email} from this workspace?`)
                                ) {
                                  removeMutation.mutate({ userId: user.id });
                                }
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite teammates</CardTitle>
            <CardDescription>
              Sends a Supabase invite email. They accept the link, sign in, and join this
              workspace automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@brokerage.com"
                  required
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as 'team_member' | 'client_admin')
                  }
                  className="flex h-11 min-h-[44px] w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="team_member">Member</option>
                  <option value="client_admin">Admin</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="cursor-pointer min-h-[44px]"
                >
                  {inviteMutation.isPending ? 'Sending…' : 'Send invite'}
                </Button>
              </div>
              {formError && (
                <p className="text-sm text-destructive sm:col-span-2">{formError}</p>
              )}
            </form>

            <div>
              <h3 className="text-sm font-medium mb-2">Pending invitations</h3>
              {invitesLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !invites?.length ? (
                <p className="text-sm text-muted-foreground">No pending invites.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{inv.email}</TableCell>
                        <TableCell>{formatRole(inv.role)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(inv.expires_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            disabled={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate({ invitationId: inv.id })}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
