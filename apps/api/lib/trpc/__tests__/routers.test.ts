import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// Mock the database client BEFORE importing routers
vi.mock('@voxori/database/client', () => ({
  createServiceRoleClient: vi.fn(),
}));

// Mock Stripe to avoid needing a real API key at module load time
vi.mock('stripe', () => {
  class StripeMock {
    billingPortal = {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/session' }),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_apiKey: string, _opts?: unknown) {}
  }
  return { default: StripeMock };
});

import { createServiceRoleClient } from '@voxori/database/client';
import { appRouter } from '../root';

// Helper to create a tRPC caller with a given context
function createCaller(ctx: Record<string, unknown>) {
  return appRouter.createCaller(ctx as any);
}

const TENANT_CTX = {
  user: { id: 'user-1', app_metadata: { tenant_id: 'tenant-1', role: 'client_admin' } },
  tenantId: 'tenant-1',
  role: 'client_admin',
  supabase: {},
};

const ANON_CTX = { user: null, tenantId: null, role: null, supabase: {} };

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── auth.me ──────────────────────────────────────────────────────────────────

describe('auth.me', () => {
  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller(ANON_CTX);
    await expect(caller.auth.me()).rejects.toThrow(TRPCError);
  });

  it('returns user and tenant data for authenticated tenant', async () => {
    // auth.me runs two parallel queries:
    //   db.from('users').select(...).eq(...).single()
    //   db.from('tenants').select(...).eq(...).single()
    const makeSingleChain = (data: unknown) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data, error: null }),
        }),
      }),
    });

    const mockDb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'users') {
          return makeSingleChain({ id: 'user-1', email: 'test@test.com', full_name: 'Test User', role: 'client_admin', tenant_id: 'tenant-1', created_at: '2026-01-01' });
        }
        // tenants
        return makeSingleChain({ id: 'tenant-1', name: 'Test Tenant', subdomain: 'test', plan: 'starter', branding: null, stripe_customer_id: null });
      }),
    };

    vi.mocked(createServiceRoleClient).mockReturnValue(mockDb as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.auth.me();
    expect(result.user).toBeTruthy();
    expect(result.tenant).toBeTruthy();
    expect((result.user as any).id).toBe('user-1');
    expect((result.tenant as any).id).toBe('tenant-1');
  });
});

// ─── agents ───────────────────────────────────────────────────────────────────

describe('agents.list', () => {
  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller(ANON_CTX);
    await expect(caller.agents.list()).rejects.toThrow(TRPCError);
  });

  it('returns agents array scoped to tenant', async () => {
    // agents.list chain: db.from('agents').select(...).eq(...).order(...)
    // The promise resolves at .order()
    const mockAgents = [
      {
        id: 'agent-1',
        name: 'Test Agent',
        is_active: true,
        tenant_id: 'tenant-1',
        voice_id: null,
        llm_model: 'gpt-4o',
        config: null,
        created_at: '2026-01-01',
      },
    ];

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockAgents, error: null }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.agents.list();
    expect(result).toEqual(mockAgents);
  });

  it('returns empty array when no agents exist', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.agents.list();
    expect(result).toEqual([]);
  });
});

describe('agents.get', () => {
  it('throws NOT_FOUND when agent does not exist for tenant', async () => {
    // agents.get chain: db.from('agents').select(*).eq(id).eq(tenant_id).single()
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    await expect(caller.agents.get({ id: '00000000-0000-0000-0000-000000000001' })).rejects.toThrow(TRPCError);
  });

  it('returns agent when found', async () => {
    const mockAgent = { id: '00000000-0000-0000-0000-000000000001', name: 'Agent One', tenant_id: 'tenant-1', is_active: true };

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockAgent, error: null }),
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.agents.get({ id: '00000000-0000-0000-0000-000000000001' });
    expect(result).toEqual(mockAgent);
  });
});

describe('agents.update', () => {
  it('throws BAD_REQUEST when no fields provided', async () => {
    // The BAD_REQUEST is thrown before any DB call, so mock can return anything
    vi.mocked(createServiceRoleClient).mockReturnValue({} as any);

    const caller = createCaller(TENANT_CTX);
    await expect(caller.agents.update({ id: '00000000-0000-0000-0000-000000000001', data: {} })).rejects.toThrow(TRPCError);
  });

  it('updates agent successfully', async () => {
    const mockUpdated = { id: '00000000-0000-0000-0000-000000000001', name: 'Updated Agent', is_active: true };

    // agents.update chain: db.from('agents').update(...).eq(id).eq(tenant_id).select().single()
    const singleMock = vi.fn().mockResolvedValue({ data: mockUpdated, error: null });
    const selectAfterEqMock = vi.fn().mockReturnValue({ single: singleMock });
    const secondEqMock = vi.fn().mockReturnValue({ select: selectAfterEqMock });
    const firstEqMock = vi.fn().mockReturnValue({ eq: secondEqMock });
    const updateMock = vi.fn().mockReturnValue({ eq: firstEqMock });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.agents.update({
      id: '00000000-0000-0000-0000-000000000001',
      data: { name: 'Updated Agent' },
    });
    expect(result).toEqual(mockUpdated);
  });
});

// ─── calls ────────────────────────────────────────────────────────────────────

describe('calls.list', () => {
  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller(ANON_CTX);
    await expect(caller.calls.list()).rejects.toThrow(TRPCError);
  });

  it('returns empty array for tenant with no calls', async () => {
    // calls.list chain: db.from('calls').select(...).eq(...).order(...).range(...)
    // The promise resolves at .range()
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.calls.list();
    expect(result).toEqual([]);
  });

  it('returns calls array for tenant', async () => {
    const mockCalls = [
      {
        id: 'call-1',
        agent_id: 'agent-1',
        caller_number: '+15551234567',
        duration_seconds: 120,
        status: 'completed',
        outcome: 'scheduled',
        started_at: '2026-01-01T10:00:00Z',
        ended_at: '2026-01-01T10:02:00Z',
        summary: 'Test call',
      },
    ];

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: mockCalls, error: null }),
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.calls.list();
    expect(result).toEqual(mockCalls);
  });
});

describe('calls.get', () => {
  it('throws NOT_FOUND when call does not belong to tenant', async () => {
    // calls.get chain: db.from('calls').select(*).eq(id).eq(tenant_id).single()
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    await expect(caller.calls.get({ id: '00000000-0000-0000-0000-000000000001' })).rejects.toThrow(TRPCError);
  });

  it('returns call when found', async () => {
    const mockCall = {
      id: '00000000-0000-0000-0000-000000000001',
      agent_id: 'agent-1',
      tenant_id: 'tenant-1',
      status: 'completed',
      call_tool_events: [],
    };

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockCall, error: null }),
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.calls.get({ id: '00000000-0000-0000-0000-000000000001' });
    expect(result).toEqual(mockCall);
  });
});
