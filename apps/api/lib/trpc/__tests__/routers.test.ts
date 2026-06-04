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
    checkout = {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session' }),
      },
    };
    customers = {
      create: vi.fn().mockResolvedValue({ id: 'cus_new' }),
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_apiKey: string, _opts?: unknown) {}
  }
  return { default: StripeMock };
});

vi.mock('../../services/mls', () => ({
  syncIntegrationListings: vi.fn().mockResolvedValue(0),
  syncTenantListings: vi.fn().mockResolvedValue(3),
}));

vi.mock('../../services/fub.service', () => ({
  validateFubApiKey: vi.fn().mockResolvedValue({ valid: true }),
}));

vi.mock('../../services/google-calendar.service', () => ({
  buildGoogleOAuthUrl: vi.fn(),
}));

import { createServiceRoleClient } from '@voxori/database/client';
import { buildGoogleOAuthUrl } from '../../services/google-calendar.service';
import { validateFubApiKey } from '../../services/fub.service';
import { syncTenantListings } from '../../services/mls';
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
  vi.clearAllMocks();
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

  it('applies status filter when provided', async () => {
    const mockCalls = [
      {
        id: 'call-1',
        agent_id: 'agent-1',
        caller_number: '+15551234567',
        duration_seconds: 60,
        status: 'missed',
        outcome: null,
        started_at: '2026-01-01T10:00:00Z',
        ended_at: null,
        summary: null,
      },
    ];

    const statusEq = vi.fn().mockResolvedValue({ data: mockCalls, error: null });
    const rangeMock = vi.fn().mockReturnValue({ eq: statusEq });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: rangeMock,
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.calls.list({ status: 'missed', limit: 20, offset: 0 });
    expect(statusEq).toHaveBeenCalledWith('status', 'missed');
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

// ─── billing ─────────────────────────────────────────────────────────────────

describe('billing.getUsageSummary', () => {
  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller(ANON_CTX);
    await expect(caller.billing.getUsageSummary()).rejects.toThrow(TRPCError);
  });

  it('returns usage and tenant rows', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'usage_records') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: { tenant_id: 'tenant-1', minutes: 42 }, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  plan: 'starter',
                  stripe_customer_id: 'cus_123',
                  stripe_subscription_id: 'sub_123',
                },
                error: null,
              }),
            }),
          }),
        };
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.billing.getUsageSummary();
    expect(result.usage).toEqual({ tenant_id: 'tenant-1', minutes: 42 });
    expect(result.tenant).toMatchObject({ plan: 'starter', stripe_customer_id: 'cus_123' });
  });
});

describe('billing.createPortalSession', () => {
  it('throws BAD_REQUEST when tenant has no Stripe customer', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: null },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    await expect(caller.billing.createPortalSession()).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('returns portal URL when Stripe customer exists', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: 'cus_abc' },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.billing.createPortalSession();
    expect(result.url).toBe('https://billing.stripe.com/session');

    delete process.env.STRIPE_SECRET_KEY;
  });
});

describe('billing.createCheckoutSession', () => {
  it('throws PRECONDITION_FAILED when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const caller = createCaller(TENANT_CTX);
    await expect(caller.billing.createCheckoutSession({})).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('returns checkout URL when Stripe is configured', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'tenant-1', name: 'Test', stripe_customer_id: 'cus_existing', plan: 'starter' },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { email: 'test@test.com' },
                error: null,
              }),
            }),
          }),
        };
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.billing.createCheckoutSession({ plan: 'starter' });
    expect(result.url).toBe('https://checkout.stripe.com/session');
    expect(result.plan).toBe('starter');

    delete process.env.STRIPE_SECRET_KEY;
  });
});

// ─── analytics ────────────────────────────────────────────────────────────────

describe('analytics.getSummary', () => {
  it('throws UNAUTHORIZED when not authenticated', async () => {
    const caller = createCaller(ANON_CTX);
    await expect(caller.analytics.getSummary()).rejects.toThrow(TRPCError);
  });

  it('returns KPI summary for tenant', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        if (table === 'calls') {
          chain.gte = vi.fn().mockResolvedValue({
            data: [
              { id: '1', status: 'completed', outcome: 'scheduled', duration_seconds: 120, started_at: '2026-05-01' },
              { id: '2', status: 'completed', outcome: 'info_only', duration_seconds: 60, started_at: '2026-05-02' },
            ],
            error: null,
          });
        }
        if (table === 'leads') {
          chain.gte = vi.fn().mockResolvedValue({
            data: [{ id: 'l1', status: 'qualified' }],
            error: null,
          });
        }
        if (table === 'bookings') {
          chain.gte = vi.fn().mockResolvedValue({
            data: [{ id: 'b1', status: 'confirmed', scheduled_at: '2026-05-03' }],
            error: null,
          });
        }
        return chain;
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.analytics.getSummary({ days: 30 });
    expect(result.totalCalls).toBe(2);
    expect(result.qualificationRate).toBe(100);
    expect(result.showingsBooked).toBeGreaterThanOrEqual(1);
  });
});

// ─── onboarding ─────────────────────────────────────────────────────────────

describe('onboarding.getProgress', () => {
  it('returns step progress for tenant', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'onboarding_steps') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ step: 'mls' }], error: null }),
            }),
          };
        }
        if (table === 'integrations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'phone_numbers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.onboarding.getProgress();
    expect(result.completedCount).toBe(1);
    expect(result.steps.find((s) => s.id === 'mls')?.completed).toBe(true);
  });
});

describe('onboarding.completeStep', () => {
  it('persists step completion', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert: upsertMock }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.onboarding.completeStep({ step: 'agent' });
    expect(result).toEqual({ step: 'agent', completed: true });
    expect(upsertMock).toHaveBeenCalled();
  });
});

// ─── integrations ───────────────────────────────────────────────────────────

describe('integrations.list', () => {
  it('maps DB integrations to API types with MLS feeds', async () => {
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'int-1',
                type: 'mls_idx',
                is_active: true,
                last_synced_at: '2026-01-01T00:00:00Z',
                market_id: 'austin_central_texas',
                config: { provider: 'bridge', market_id: 'austin_central_texas' },
              },
              {
                id: 'int-2',
                type: 'mls_idx',
                is_active: true,
                last_synced_at: '2026-01-02T00:00:00Z',
                market_id: 'central_texas_ctx',
                config: { provider: 'trestle', market_id: 'central_texas_ctx' },
              },
            ],
            error: null,
          }),
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: selectMock,
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.integrations.list();
    const mls = result.find((row) => row.type === 'mls');
    expect(mls?.connected).toBe(true);
    expect(mls?.provider).toBe('multi');
    expect(mls?.feeds).toHaveLength(2);
    expect(mls?.feeds?.[0]?.provider).toBe('bridge');
    expect(mls?.feeds?.[1]?.provider).toBe('trestle');
    expect(selectMock).toHaveBeenCalledWith(
      'id, type, is_active, last_synced_at, config, market_id'
    );
  });
});

describe('integrations.connect', () => {
  const ENCRYPTION_ENV = { CREDENTIALS_ENCRYPTION_KEY: 'test-integration-encryption-key' };

  beforeEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = ENCRYPTION_ENV.CREDENTIALS_ENCRYPTION_KEY;
    vi.mocked(validateFubApiKey).mockResolvedValue({ valid: true });
  });

  it('fails connect when credentials encryption is not configured', async () => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    delete process.env.INTERNAL_API_SECRET;

    const caller = createCaller(TENANT_CTX);
    await expect(
      caller.integrations.connect({
        type: 'crm',
        credentials: { api_key: 'fka_test_key_12345' },
      })
    ).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
      message: expect.stringContaining('CREDENTIALS_ENCRYPTION_KEY'),
    });
  });

  it('connects MLS integration and marks onboarding step', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'int-1', last_synced_at: '2026-01-01' },
          error: null,
        }),
      }),
    });

    const integrationsSelectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          is: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'integrations') {
          return {
            select: integrationsSelectMock,
            insert: insertMock,
            update: vi.fn(),
          };
        }
        if (table === 'onboarding_steps') return { upsert: vi.fn().mockResolvedValue({ error: null }) };
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.integrations.connect({
      type: 'mls',
      credentials: { api_key: 'test-idx-key-1234567890ab' },
    });
    expect(result.connected).toBe(true);
    if (result.connected && result.status === 'connected') {
      expect(result.marketId).toBe('idx_broker_primary');
    }
    expect(insertMock).toHaveBeenCalled();
  });

  it('requires and encrypts Follow Up Boss API key for CRM connect', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'int-crm', last_synced_at: '2026-01-01' },
          error: null,
        }),
      }),
    });

    const crmSelectChain = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    };

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'integrations') {
          return {
            select: vi.fn().mockReturnValue(crmSelectChain),
            insert: insertMock,
            update: vi.fn(),
          };
        }
        if (table === 'onboarding_steps') return { upsert: vi.fn().mockResolvedValue({ error: null }) };
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    await expect(caller.integrations.connect({ type: 'crm' })).rejects.toThrow(TRPCError);

    const result = await caller.integrations.connect({
      type: 'crm',
      credentials: { api_key: 'fka_test_key_12345' },
    });
    expect(result.connected).toBe(true);
    expect(validateFubApiKey).toHaveBeenCalledWith('fka_test_key_12345');
    const insertArg = insertMock.mock.calls[0]?.[0] as { credentials?: Record<string, unknown> };
    expect(insertArg).toMatchObject({
      tenant_id: 'tenant-1',
      type: 'crm',
      is_active: true,
      config: expect.objectContaining({ provider: 'follow_up_boss' }),
    });
    expect(insertArg.credentials).toMatchObject({
      _encrypted: true,
      iv: expect.any(String),
      tag: expect.any(String),
      payload: expect.any(String),
    });
    expect(insertArg.credentials).not.toHaveProperty('api_key');
  });

  it('rejects invalid Follow Up Boss API key', async () => {
    vi.mocked(validateFubApiKey).mockResolvedValueOnce({
      valid: false,
      message: 'Invalid Follow Up Boss API key',
    });

    const caller = createCaller(TENANT_CTX);
    await expect(
      caller.integrations.connect({
        type: 'crm',
        credentials: { api_key: 'bad-key' },
      })
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Invalid Follow Up Boss API key',
    });
  });

  it('updates existing inactive CRM row instead of inserting', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'int-crm-legacy', last_synced_at: '2026-06-01' },
            error: null,
          }),
        }),
      }),
    });
    const insertMock = vi.fn();

    const crmSelectChain = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'int-crm-legacy' }],
                error: null,
              }),
            }),
          }),
        }),
      }),
    };

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'integrations') {
          return {
            select: vi.fn().mockReturnValue(crmSelectChain),
            insert: insertMock,
            update: updateMock,
          };
        }
        if (table === 'onboarding_steps') return { upsert: vi.fn().mockResolvedValue({ error: null }) };
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.integrations.connect({
      type: 'crm',
      credentials: { api_key: 'fka_test_key_12345' },
    });

    expect(result.connected).toBe(true);
    expect(updateMock).toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('returns oauthUrl for calendar connect when OAuth is configured', async () => {
    vi.mocked(buildGoogleOAuthUrl).mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?test=1');

    const caller = createCaller(TENANT_CTX);
    const result = await caller.integrations.connect({ type: 'calendar' });

    expect(result).toEqual({
      type: 'calendar',
      connected: false,
      status: 'oauth_required',
      oauthUrl: 'https://accounts.google.com/o/oauth2/v2/auth?test=1',
    });
  });

  it('throws when calendar OAuth is not configured', async () => {
    vi.mocked(buildGoogleOAuthUrl).mockReturnValue(null);

    const caller = createCaller(TENANT_CTX);
    await expect(caller.integrations.connect({ type: 'calendar' })).rejects.toThrow(TRPCError);
  });
});

describe('integrations.getCalendarOAuthUrl', () => {
  it('returns oauth URL when configured', async () => {
    vi.mocked(buildGoogleOAuthUrl).mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?x=1');

    const caller = createCaller(TENANT_CTX);
    const result = await caller.integrations.getCalendarOAuthUrl();
    expect(result.oauthUrl).toContain('accounts.google.com');
  });

  it('throws PRECONDITION_FAILED when Google client id is missing', async () => {
    vi.mocked(buildGoogleOAuthUrl).mockReturnValue(null);

    const caller = createCaller(TENANT_CTX);
    await expect(caller.integrations.getCalendarOAuthUrl()).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });
});

describe('phoneNumbers.create', () => {
  it('rejects invalid E.164 numbers', async () => {
    const caller = createCaller(TENANT_CTX);
    await expect(
      caller.phoneNumbers.create({
        number: '5125551234',
        agentId: 'agent-1',
      })
    ).rejects.toThrow(TRPCError);
  });

  it('creates phone number and marks onboarding step', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'phone-1',
            number: '+15125551234',
            is_active: true,
            agent_id: 'agent-1',
            twilio_sid: null,
            created_at: '2026-01-01',
          },
          error: null,
        }),
      }),
    });
    const onboardingUpsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'agents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'agent-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'phone_numbers') return { insert: insertMock };
        if (table === 'onboarding_steps') return { upsert: onboardingUpsert };
        return { insert: insertMock };
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.phoneNumbers.create({
      number: '+15125551234',
      agentId: '00000000-0000-4000-8000-000000000001',
    });

    expect(result.number).toBe('+15125551234');
    expect(onboardingUpsert).toHaveBeenCalled();
  });
});

describe('phoneNumbers.delete', () => {
  it('soft-deletes by setting is_active false', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'phone-1' },
              error: null,
            }),
          }),
        }),
      }),
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.phoneNumbers.delete({
      id: '00000000-0000-4000-8000-000000000099',
    });
    expect(result.deleted).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({ is_active: false });
  });
});

describe('listings.list', () => {
  it('returns tenant-scoped listings', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [{ id: 'listing-1', address: '123 Main St' }],
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.listings.list({ limit: 10 });
    expect(result).toHaveLength(1);
  });
});

describe('listings.sync', () => {
  it('syncs tenant listings and returns count', async () => {
    vi.mocked(syncTenantListings).mockResolvedValue(4);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.listings.sync();

    expect(result).toEqual({
      synced: 4,
      message: 'Synced 4 listings.',
    });
    expect(syncTenantListings).toHaveBeenCalledWith(expect.anything(), TENANT_CTX.tenantId);
  });
});

describe('integrations.disconnect', () => {
  it('deactivates integration', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.integrations.disconnect({ type: 'crm' });
    expect(result).toEqual({ type: 'crm', connected: false });
  });
});

// ─── phoneNumbers ─────────────────────────────────────────────────────────────

describe('phoneNumbers.create', () => {
  it('rejects invalid E.164 numbers', async () => {
    const caller = createCaller(TENANT_CTX);
    await expect(
      caller.phoneNumbers.create({
        number: '512-555-0100',
        agentId: 'agent-1',
      })
    ).rejects.toThrow(TRPCError);
  });

  it('creates phone number and marks onboarding step', async () => {
    const upsertOnboarding = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'agents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'agent-1' }, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'phone_numbers') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'pn-1',
                    number: '+15125550100',
                    is_active: true,
                    agent_id: 'agent-1',
                    twilio_sid: null,
                    created_at: '2026-01-01',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'onboarding_steps') return { upsert: upsertOnboarding };
        return {};
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.phoneNumbers.create({
      number: '+15125550100',
      agentId: '00000000-0000-4000-8000-000000000001',
    });
    expect(result.number).toBe('+15125550100');
    expect(upsertOnboarding).toHaveBeenCalled();
  });
});

describe('phoneNumbers.delete', () => {
  it('soft-deletes by setting is_active false', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'pn-1' }, error: null }),
          }),
        }),
      }),
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.phoneNumbers.delete({
      id: '00000000-0000-4000-8000-000000000099',
    });
    expect(result.deleted).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({ is_active: false });
  });
});

// ─── listings ─────────────────────────────────────────────────────────────────

describe('listings.list', () => {
  it('returns tenant-scoped listings', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [{ id: 'listing-1', address: '123 Main St', status: 'active' }],
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.listings.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.address).toBe('123 Main St');
  });
});

// ─── team ─────────────────────────────────────────────────────────────────────

describe('team.listMembers', () => {
  it('returns members for the tenant', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'user-1',
                  email: 'admin@test.com',
                  full_name: 'Admin',
                  role: 'client_admin',
                  created_at: '2026-01-01',
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const caller = createCaller(TENANT_CTX);
    const result = await caller.team.listMembers();
    expect(result).toHaveLength(1);
    expect(result[0]?.email).toBe('admin@test.com');
  });
});

describe('team.invite', () => {
  it('forbids team_member role', async () => {
    const caller = createCaller({
      ...TENANT_CTX,
      role: 'team_member',
    });
    await expect(
      caller.team.invite({ email: 'new@test.com', role: 'team_member' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
