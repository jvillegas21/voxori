import { describe, it, expect } from 'vitest';
import { TRPCError } from '@trpc/server';
import { tenantProcedure, adminProcedure, clientAdminProcedure } from '../init';

// Helper to invoke the last middleware of a procedure
async function callMiddleware(procedure: any, ctx: Record<string, unknown>) {
  const middleware = (procedure as any)._def.middlewares.at(-1);
  let nextCalled = false;
  await middleware({
    ctx,
    next: async (opts?: any) => {
      nextCalled = true;
      return { result: 'ok', ...(opts ?? {}) };
    },
    input: undefined,
    path: 'test',
    type: 'query',
    getRawInput: async () => undefined,
    meta: undefined,
  });
  return nextCalled;
}

describe('tenantProcedure guard', () => {
  it('throws UNAUTHORIZED when user is null', async () => {
    await expect(
      callMiddleware(tenantProcedure, { user: null, tenantId: null, role: null })
    ).rejects.toThrow(TRPCError);
  });

  it('throws UNAUTHORIZED when tenantId is null', async () => {
    await expect(
      callMiddleware(tenantProcedure, { user: { id: '1' }, tenantId: null, role: null })
    ).rejects.toThrow(TRPCError);
  });

  it('calls next() when user and tenantId are present', async () => {
    const called = await callMiddleware(tenantProcedure, {
      user: { id: '1' },
      tenantId: 'tenant-1',
      role: 'client_admin',
      supabase: {},
    });
    expect(called).toBe(true);
  });
});

describe('adminProcedure guard', () => {
  it('throws FORBIDDEN when role is client_admin', async () => {
    await expect(
      callMiddleware(adminProcedure, {
        user: { id: '1' },
        tenantId: 't1',
        role: 'client_admin',
        supabase: {},
      })
    ).rejects.toThrow(TRPCError);
  });

  it('throws FORBIDDEN when user is null', async () => {
    await expect(
      callMiddleware(adminProcedure, {
        user: null,
        tenantId: null,
        role: null,
        supabase: {},
      })
    ).rejects.toThrow(TRPCError);
  });

  it('calls next() when role is super_admin', async () => {
    const called = await callMiddleware(adminProcedure, {
      user: { id: 'admin-1' },
      tenantId: null,
      role: 'super_admin',
      supabase: {},
    });
    expect(called).toBe(true);
  });
});

describe('clientAdminProcedure guard', () => {
  it('throws FORBIDDEN when role is team_member', async () => {
    await expect(
      callMiddleware(clientAdminProcedure, {
        user: { id: '1' },
        tenantId: 'tenant-1',
        role: 'team_member',
        supabase: {},
      })
    ).rejects.toThrow(TRPCError);
  });

  it('calls next() when role is client_admin', async () => {
    const called = await callMiddleware(clientAdminProcedure, {
      user: { id: '1' },
      tenantId: 'tenant-1',
      role: 'client_admin',
      supabase: {},
    });
    expect(called).toBe(true);
  });
});
