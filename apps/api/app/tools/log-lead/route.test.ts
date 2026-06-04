import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@voxori/database/client', () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock('../../../lib/services/fub.service', () => ({
  pushLeadToFub: vi.fn().mockResolvedValue({ synced: false, externalId: null }),
}));

const { logToolExecution, resolveToolCallId } = vi.hoisted(() => ({
  logToolExecution: vi.fn().mockResolvedValue(undefined),
  resolveToolCallId: vi.fn().mockResolvedValue('11111111-1111-4111-8111-111111111199'),
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
  resolveToolCallId.mockResolvedValue('11111111-1111-4111-8111-111111111199');
});

describe('POST /tools/log-lead', () => {
  it('returns 401 without tool secret', async () => {
    const req = new NextRequest('http://localhost:3002/tools/log-lead', {
      method: 'POST',
      body: JSON.stringify({ caller_phone: '+15551234567' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('logs lead and records tool event when callId present', async () => {
    const leadInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'lead-1' },
          error: null,
        }),
      }),
    });

    const webhookInsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'leads') return { insert: leadInsert };
        if (table === 'webhook_logs') return { insert: webhookInsert };
        return { insert: vi.fn() };
      }),
    } as never);

    const req = new NextRequest('http://localhost:3002/tools/log-lead', {
      method: 'POST',
      headers: {
        'x-voxori-tool-secret': 'any',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caller_phone: '+15551234567',
        caller_name: 'Test Caller',
        callId: '11111111-1111-4111-8111-111111111199',
      }),
      duplex: 'half',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { logged: boolean };
    expect(body.logged).toBe(true);
    expect(leadInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        call_id: '11111111-1111-4111-8111-111111111199',
        status: 'new',
      })
    );
    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: 'log-lead',
        callId: '11111111-1111-4111-8111-111111111199',
      })
    );
  });
});
