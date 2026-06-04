import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@voxori/database/client', () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock('../../../lib/services/vapi-call.service', () => ({
  handleCallStarted: vi.fn().mockResolvedValue(undefined),
  handleCallEnded: vi.fn().mockResolvedValue({ callId: 'call-1', duplicate: false }),
  dispatchPostCallSms: vi.fn(),
  dispatchRecordingMigrate: vi.fn(),
}));

import { createServiceRoleClient } from '@voxori/database/client';
import {
  handleCallStarted,
  handleCallEnded,
  dispatchPostCallSms,
} from '../../../lib/services/vapi-call.service';
import { POST } from './route';

const WEBHOOK_SECRET = 'test-vapi-secret';

function makeRequest(body: unknown, secret = WEBHOOK_SECRET) {
  return new NextRequest('http://localhost:3002/webhooks/vapi', {
    method: 'POST',
    headers: { 'x-vapi-secret': secret, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.VAPI_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.API_BASE_URL = 'http://localhost:3002';
  process.env.INTERNAL_API_SECRET = 'internal-secret';

  vi.mocked(createServiceRoleClient).mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tenant_id: 'tenant-1' },
            error: null,
          }),
        }),
      }),
    }),
  } as never);
});

describe('POST /webhooks/vapi', () => {
  it('returns 401 when secret is invalid', async () => {
    const res = await POST(makeRequest({ message: { type: 'call-started' } }, 'wrong'));
    expect(res.status).toBe(401);
  });

  it('delegates call-started to vapi-call service', async () => {
    const res = await POST(
      makeRequest({
        message: {
          type: 'call-started',
          call: { id: 'vapi-call-abc', assistantId: 'asst-1' },
        },
      })
    );

    expect(res.status).toBe(200);
    expect(handleCallStarted).toHaveBeenCalled();
  });

  it('delegates call-ended and dispatches post-call SMS', async () => {
    const res = await POST(
      makeRequest({
        message: {
          type: 'call-ended',
          call: { id: 'vapi-call-abc', assistantId: 'asst-1' },
          artifact: { summary: 'Booked showing' },
        },
      })
    );

    expect(res.status).toBe(200);
    expect(handleCallEnded).toHaveBeenCalled();
    expect(dispatchPostCallSms).toHaveBeenCalledWith('call-1', 'tenant-1');
  });

  it('does not persist function-call tool events (tools-only)', async () => {
    const res = await POST(
      makeRequest({
        message: {
          type: 'function-call',
          call: { id: 'vapi-call-abc', assistantId: 'asst-1' },
          functionCall: { name: 'search-listings', parameters: {} },
        },
      })
    );

    expect(res.status).toBe(200);
    expect(handleCallStarted).not.toHaveBeenCalled();
    expect(handleCallEnded).not.toHaveBeenCalled();
    expect(dispatchPostCallSms).not.toHaveBeenCalled();
  });
});
