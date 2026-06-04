import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@voxori/database/client', () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({}),
}));

vi.mock('../../../../lib/services/google-calendar.service', () => ({
  exchangeGoogleCode: vi.fn(),
}));

vi.mock('../../../../lib/services/onboarding.service', () => ({
  markStepComplete: vi.fn().mockResolvedValue(undefined),
}));

import { exchangeGoogleCode } from '../../../../lib/services/google-calendar.service';
import { markStepComplete } from '../../../../lib/services/onboarding.service';
import { GET } from './route';

const APP_URL = 'http://localhost:3000';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = APP_URL;
});

describe('GET /integrations/google/callback', () => {
  it('redirects to onboarding calendar step on success', async () => {
    vi.mocked(exchangeGoogleCode).mockResolvedValue({ tenantId: 'tenant-1' });

    const req = new NextRequest(
      'http://localhost:3002/integrations/google/callback?code=abc&state=signed'
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${APP_URL}/onboarding?step=calendar&connected=1`
    );
    expect(markStepComplete).toHaveBeenCalledWith(expect.anything(), 'tenant-1', 'calendar');
  });

  it('redirects with error when OAuth exchange fails', async () => {
    vi.mocked(exchangeGoogleCode).mockResolvedValue({ error: 'Invalid OAuth state' });

    const req = new NextRequest(
      'http://localhost:3002/integrations/google/callback?code=abc&state=bad'
    );
    const res = await GET(req);

    expect(res.headers.get('location')).toContain('/onboarding?step=calendar');
    expect(res.headers.get('location')).toContain('error=Invalid');
    expect(markStepComplete).not.toHaveBeenCalled();
  });

  it('redirects when code or state is missing', async () => {
    const req = new NextRequest('http://localhost:3002/integrations/google/callback');
    const res = await GET(req);

    expect(res.headers.get('location')).toContain('missing_oauth_params');
    expect(exchangeGoogleCode).not.toHaveBeenCalled();
  });
});
