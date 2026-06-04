import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildToolIdempotencyKey,
  normalizeToolName,
  recordToolEvent,
} from '../call-tool-events.service';

const insertMock = vi.fn();

const db = {
  from: vi.fn().mockImplementation((table: string) => {
    if (table === 'calls') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'internal-call-1' },
            error: null,
          }),
        }),
      };
    }
    if (table === 'call_tool_events') {
      return { insert: insertMock };
    }
    return { insert: insertMock };
  }),
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  insertMock.mockResolvedValue({ error: null });
});

describe('normalizeToolName', () => {
  it('converts kebab-case and camelCase to snake_case', () => {
    expect(normalizeToolName('search-listings')).toBe('search_listings');
    expect(normalizeToolName('logLead')).toBe('log_lead');
  });
});

describe('buildToolIdempotencyKey', () => {
  it('is stable for the same input', () => {
    const a = buildToolIdempotencyKey({
      callId: 'call-1',
      toolName: 'search_listings',
      input: { max_price: 500000 },
    });
    const b = buildToolIdempotencyKey({
      callId: 'call-1',
      toolName: 'search_listings',
      input: { max_price: 500000 },
    });
    expect(a).toBe(b);
  });
});

describe('recordToolEvent', () => {
  it('skips insert when call cannot be resolved', async () => {
    const emptyDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    } as never;

    const result = await recordToolEvent(emptyDb, {
      tenantId: 'tenant-1',
      agentId: 'agent-1',
      callId: 'unknown-vapi-id',
      toolName: 'log-lead',
      input: { phone: '+1' },
    });

    expect(result.recorded).toBe(false);
    expect(result.callId).toBeNull();
  });

  it('inserts normalized tool event with idempotency key', async () => {
    const result = await recordToolEvent(db, {
      tenantId: 'tenant-1',
      agentId: 'agent-1',
      callId: 'vapi-abc',
      toolName: 'search-listings',
      input: { max_price: 400000 },
      output: { count: 2 },
      durationMs: 120,
    });

    expect(result.recorded).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        call_id: 'internal-call-1',
        tool_name: 'search_listings',
        idempotency_key: expect.any(String),
        status: 'success',
      })
    );
  });

  it('treats unique violations as duplicate', async () => {
    insertMock.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } });

    const result = await recordToolEvent(db, {
      tenantId: 'tenant-1',
      agentId: 'agent-1',
      callId: 'vapi-abc',
      toolName: 'log-lead',
      input: {},
    });

    expect(result.recorded).toBe(false);
    expect(result.duplicate).toBe(true);
  });
});
