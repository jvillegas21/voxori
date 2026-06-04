import { createHash, randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@voxori/database';

type Db = SupabaseClient<Database>;
type UserRole = Database['public']['Enums']['user_role'];

const INVITE_TTL_DAYS = 7;
const ASSIGNABLE_ROLES: UserRole[] = ['client_admin', 'team_member'];

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

export function isAssignableTeamRole(role: UserRole): boolean {
  return ASSIGNABLE_ROLES.includes(role);
}

export async function createTenantInvitation(
  db: Db,
  params: {
    tenantId: string;
    email: string;
    role: UserRole;
    invitedBy: string;
  }
): Promise<{ invitationId: string; rawToken: string }> {
  const email = params.email.trim().toLowerCase();
  if (!email.includes('@')) {
    throw new Error('Invalid email address');
  }
  if (!isAssignableTeamRole(params.role)) {
    throw new Error('Invalid role for invitation');
  }

  const { data: existingMember } = await db
    .from('users')
    .select('id')
    .eq('tenant_id', params.tenantId)
    .ilike('email', email)
    .maybeSingle();

  if (existingMember) {
    throw new Error('This email is already a member of the workspace');
  }

  const { data: pending } = await db
    .from('tenant_invitations')
    .select('id')
    .eq('tenant_id', params.tenantId)
    .eq('status', 'pending')
    .ilike('email', email)
    .maybeSingle();

  if (pending) {
    throw new Error('A pending invitation already exists for this email');
  }

  const rawToken = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: row, error } = await db
    .from('tenant_invitations')
    .insert({
      tenant_id: params.tenantId,
      email,
      role: params.role,
      token_hash: hashInviteToken(rawToken),
      invited_by: params.invitedBy,
      expires_at: expiresAt,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? 'Failed to create invitation');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const redirectTo = `${appUrl}/invite/accept?token=${encodeURIComponent(rawToken)}`;

  const { error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      invitation_id: row.id,
      tenant_id: params.tenantId,
      invited_role: params.role,
    },
  });

  if (inviteError) {
    await db.from('tenant_invitations').delete().eq('id', row.id);
    throw new Error(inviteError.message);
  }

  return { invitationId: row.id, rawToken };
}

export async function acceptTenantInvitation(
  db: Db,
  params: { rawToken: string; userId: string; userEmail: string }
): Promise<{ tenantId: string; role: UserRole }> {
  const tokenHash = hashInviteToken(params.rawToken);
  const email = params.userEmail.trim().toLowerCase();

  const { data: invitation } = await db
    .from('tenant_invitations')
    .select('id, tenant_id, email, role, status, expires_at')
    .eq('token_hash', tokenHash)
    .eq('status', 'pending')
    .maybeSingle();

  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }

  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    await db
      .from('tenant_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);
    throw new Error('Invitation has expired');
  }

  if (invitation.email.toLowerCase() !== email) {
    throw new Error('Sign in with the email address that received the invitation');
  }

  const { data: existingUser } = await db
    .from('users')
    .select('id, tenant_id')
    .eq('id', params.userId)
    .maybeSingle();

  if (existingUser && existingUser.tenant_id !== invitation.tenant_id) {
    throw new Error('Your account is already linked to another workspace');
  }

  if (!existingUser) {
    const { error: insertError } = await db.from('users').insert({
      id: params.userId,
      tenant_id: invitation.tenant_id,
      email,
      full_name: null,
      role: invitation.role,
    });
    if (insertError) {
      throw new Error(insertError.message);
    }
  } else {
    const { error: updateError } = await db
      .from('users')
      .update({ role: invitation.role })
      .eq('id', params.userId);
    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  await db
    .from('tenant_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  await db.auth.admin.updateUserById(params.userId, {
    app_metadata: {
      tenant_id: invitation.tenant_id,
      role: invitation.role,
    },
  });

  return { tenantId: invitation.tenant_id, role: invitation.role };
}
