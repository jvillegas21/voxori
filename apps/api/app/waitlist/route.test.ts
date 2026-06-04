import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@voxori/database/client', () => ({
  createServiceRoleClient: vi.fn(),
}));

import { createServiceRoleClient } from '@voxori/database/client';
import { POST } from './route';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /waitlist', () => {
  it('returns 400 for invalid email', async () => {
    const req = new NextRequest('http://localhost:3002/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('persists valid email', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockReturnValue({ upsert: upsertMock }),
    } as never);

    const req = new NextRequest('http://localhost:3002/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'agent@brokerage.com', source: 'test' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(
      { email: 'agent@brokerage.com', source: 'test' },
      { onConflict: 'email', ignoreDuplicates: false }
    );
  });
});
