import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@voxori/database/client', () => ({
  createServiceRoleClient: vi.fn(),
}));

import { createServiceRoleClient } from '@voxori/database/client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { POST } = await import('../impersonate/route');

function makeRequest(body: object, secret = 'test-secret') {
  return new Request('http://localhost/admin/impersonate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-voxori-admin-secret': secret,
    },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_API_SECRET = 'test-secret';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

describe('POST /admin/impersonate', () => {
  it('returns 401 with wrong admin secret', async () => {
    const res = await POST(makeRequest({ tenantId: 't1', actorUserId: 'a1' }, 'wrong'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when no client_admin exists for tenant', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }),
    } as any);

    const res = await POST(makeRequest({ tenantId: 'no-tenant', actorUserId: 'a1' }));
    expect(res.status).toBe(404);
  });

  it('calls /auth/v1/admin/generate_link with the user EMAIL (not user ID)', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () =>
                    Promise.resolve({ data: { id: 'user-1', email: 'tenant@test.com' }, error: null }),
                }),
              }),
            }),
          };
        }
        // audit_log insert
        return { insert: () => Promise.resolve({ error: null }) };
      },
    } as any);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ action_link: 'https://test.supabase.co/auth/v1/verify?token=abc123' }),
    });

    const res = await POST(makeRequest({ tenantId: 'tenant-1', actorUserId: 'admin-1' }));
    const body = await res.json();

    // THE KEY ASSERTION: must use /admin/generate_link, not /admin/users/{id}/generate-link
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.supabase.co/auth/v1/admin/generate_link',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"email":"tenant@test.com"'),
      })
    );
    expect(body.actionLink).toBeTruthy();
    expect(body.targetEmail).toBe('tenant@test.com');
  });

  it('returns 500 when Supabase generate_link fails', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: 'user-1', email: 'tenant@test.com' }, error: null }),
            }),
          }),
        }),
      }),
    } as any);

    mockFetch.mockResolvedValueOnce({ ok: false, text: () => Promise.resolve('Error') });

    const res = await POST(makeRequest({ tenantId: 'tenant-1', actorUserId: 'admin-1' }));
    expect(res.status).toBe(500);
  });
});
