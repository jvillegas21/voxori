import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateFubApiKey } from '../fub.service';

describe('validateFubApiKey', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts a key when FUB /identity returns 200', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200 } as Response);

    const result = await validateFubApiKey('fka_test_valid_key');

    expect(result).toEqual({ valid: true });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.followupboss.com/v1/identity',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      })
    );
  });

  it('rejects empty keys', async () => {
    const result = await validateFubApiKey('   ');
    expect(result).toEqual({ valid: false, message: 'API key is required' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns a friendly message for invalid keys', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as Response);

    const result = await validateFubApiKey('bad-key');

    expect(result).toEqual({ valid: false, message: 'Invalid Follow Up Boss API key' });
  });

  it('handles network failures', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));

    const result = await validateFubApiKey('fka_test_key');

    expect(result).toEqual({
      valid: false,
      message: 'Could not reach Follow Up Boss. Check your connection and try again.',
    });
  });
});
