import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@voxori/database/client', () => ({
  createServiceRoleClient: vi.fn(),
}));

const { logToolExecution, resolveToolCallId } = vi.hoisted(() => ({
  logToolExecution: vi.fn().mockResolvedValue(undefined),
  resolveToolCallId: vi.fn().mockResolvedValue('internal-call-1'),
}));

vi.mock('../../../lib/services/tool-route-helper', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/services/tool-route-helper')>();
  return {
    ...actual,
    authenticateToolRequest: vi.fn().mockImplementation(async (req: NextRequest) => {
      if (!req.headers.get('x-voxori-tool-secret')) {
        return NextResponse.json({ error: 'Missing X-Voxori-Tool-Secret' }, { status: 401 });
      }
      return { agentId: 'agent-1', tenantId: 'tenant-1' };
    }),
    logToolExecution,
    resolveToolCallId,
  };
});

import { createServiceRoleClient } from '@voxori/database/client';
import { POST } from './route';

beforeEach(() => {
  vi.clearAllMocks();
  resolveToolCallId.mockResolvedValue('internal-call-1');
});

describe('POST /tools/record-consent', () => {
  it('returns 401 without tool secret', async () => {
    const req = new NextRequest('http://localhost:3002/tools/record-consent', {
      method: 'POST',
      body: JSON.stringify({ consent_given: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('updates call consent and records tool event', async () => {
    const thirdEq = vi.fn().mockResolvedValue({ error: null });
    const secondEq = vi.fn().mockReturnValue({ eq: thirdEq });
    const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
    const update = vi.fn().mockReturnValue({ eq: firstEq });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'calls') return { update };
        return { update: vi.fn() };
      }),
    } as never);

    const req = new NextRequest('http://localhost:3002/tools/record-consent', {
      method: 'POST',
      headers: {
        'x-voxori-tool-secret': 'any',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consent_given: true,
        consent_state: 'verbal_tx',
        callId: 'vapi-call-123',
      }),
      duplex: 'half',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { recorded: boolean; consent_given: boolean };
    expect(body.recorded).toBe(true);
    expect(body.consent_given).toBe(true);
    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: 'record-consent',
        callId: 'vapi-call-123',
      })
    );
  });

  it('returns 404 when call cannot be resolved', async () => {
    resolveToolCallId.mockResolvedValueOnce(null);

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn(),
    } as never);

    const req = new NextRequest('http://localhost:3002/tools/record-consent', {
      method: 'POST',
      headers: {
        'x-voxori-tool-secret': 'any',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ consent_given: false }),
      duplex: 'half',
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
