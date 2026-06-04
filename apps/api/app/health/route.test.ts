import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('GET /health', () => {
  it('returns ok payload with service name', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      service: string;
      timestamp: string;
    };
    expect(body.status).toBe('ok');
    expect(body.service).toBe('voxori-api');
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
