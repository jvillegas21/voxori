import { describe, it, expect } from 'vitest';
import { ADMIN_PUBLIC_ROUTES } from '../public-routes';
import { ADMIN_NAV_ITEMS, isKnownAdminAppPath } from '../routes';

describe('ADMIN_PUBLIC_ROUTES', () => {
  it('lists sign-in as the only public route', () => {
    expect(ADMIN_PUBLIC_ROUTES).toEqual(['/sign-in']);
  });
});

describe('ADMIN_NAV_ITEMS', () => {
  it('has unique hrefs and each is known', () => {
    const hrefs = ADMIN_NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) {
      expect(isKnownAdminAppPath(href)).toBe(true);
    }
  });
});

describe('isKnownAdminAppPath', () => {
  it('accepts root redirect target and account detail UUID paths', () => {
    expect(isKnownAdminAppPath('/')).toBe(true);
    expect(
      isKnownAdminAppPath('/accounts/550e8400-e29b-41d4-a716-446655440000')
    ).toBe(true);
  });

  it('rejects unknown paths', () => {
    expect(isKnownAdminAppPath('/unknown')).toBe(false);
    expect(isKnownAdminAppPath('/accounts/not-uuid')).toBe(false);
  });
});
