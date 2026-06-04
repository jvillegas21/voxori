import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, tenantProcedure, clientAdminProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';
import type { Database } from '@voxori/database';
import {
  createTenantInvitation,
  isAssignableTeamRole,
} from '../../services/team.service';

type UserRole = Database['public']['Enums']['user_role'];

const roleSchema = z.enum(['client_admin', 'team_member']);

export const teamRouter = router({
  listMembers: tenantProcedure.query(async ({ ctx }) => {
    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('users')
      .select('id, email, full_name, role, created_at')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at');

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return data ?? [];
  }),

  listInvites: clientAdminProcedure.query(async ({ ctx }) => {
    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('tenant_invitations')
      .select('id, email, role, status, expires_at, created_at, invited_by')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return data ?? [];
  }),

  invite: clientAdminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: roleSchema.default('team_member'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      try {
        const result = await createTenantInvitation(db, {
          tenantId: ctx.tenantId,
          email: input.email,
          role: input.role as UserRole,
          invitedBy: ctx.user.id,
        });
        return { ok: true as const, invitationId: result.invitationId };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invite failed';
        throw new TRPCError({ code: 'BAD_REQUEST', message });
      }
    }),

  revokeInvite: clientAdminProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const { data, error } = await db
        .from('tenant_invitations')
        .update({ status: 'revoked' })
        .eq('id', input.invitationId)
        .eq('tenant_id', ctx.tenantId)
        .eq('status', 'pending')
        .select('id')
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      }
      return { revoked: true, id: data.id };
    }),

  updateRole: clientAdminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: roleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot change your own role here',
        });
      }

      if (!isAssignableTeamRole(input.role as UserRole)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid role' });
      }

      const db = createServiceRoleClient();
      const { data, error } = await db
        .from('users')
        .update({ role: input.role })
        .eq('id', input.userId)
        .eq('tenant_id', ctx.tenantId)
        .select('id, role')
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
      }

      await db.auth.admin.updateUserById(input.userId, {
        app_metadata: { tenant_id: ctx.tenantId, role: input.role },
      });

      return data;
    }),

  removeMember: clientAdminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot remove yourself from the workspace',
        });
      }

      const db = createServiceRoleClient();
      const { data: target } = await db
        .from('users')
        .select('id, role')
        .eq('id', input.userId)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle();

      if (!target) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
      }

      if (target.role === 'client_admin') {
        const { count } = await db
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', ctx.tenantId)
          .eq('role', 'client_admin');

        if ((count ?? 0) <= 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot remove the last workspace admin',
          });
        }
      }

      const { error } = await db.from('users').delete().eq('id', input.userId);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return { removed: true, userId: input.userId };
    }),
});
