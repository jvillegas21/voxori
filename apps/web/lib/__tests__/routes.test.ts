import { describe, it, expect } from 'vitest';
import { PUBLIC_ROUTES } from '../public-routes';
import {
  WEB_NAV_ITEMS,
  WEB_IN_APP_LINK_PATHS,
  isKnownWebAppPath,
} from '../routes';

describe('PUBLIC_ROUTES', () => {
  it('lists every path the auth middleware treats as public', () => {
    expect(PUBLIC_ROUTES).toEqual([
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/reset-password',
      '/auth/callback',
      '/invite/accept',
      '/landing',
      '/pricing',
      '/waitlist',
      '/about',
      '/how-it-works',
      '/tour',
    ]);
  });
});

describe('WEB_NAV_ITEMS', () => {
  it('has unique hrefs and every href is a known app path', () => {
    const hrefs = WEB_NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) {
      expect(isKnownWebAppPath(href)).toBe(true);
    }
  });
});

describe('WEB_IN_APP_LINK_PATHS', () => {
  it('includes only paths that resolve to real routes or public auth', () => {
    for (const p of WEB_IN_APP_LINK_PATHS) {
      expect(isKnownWebAppPath(p)).toBe(true);
    }
  });
});

describe('isKnownWebAppPath', () => {
  it('accepts call detail UUID paths', () => {
    expect(
      isKnownWebAppPath('550e8400-e29b-41d4-a716-446655440000')
    ).toBe(false);
    expect(
      isKnownWebAppPath('/calls/550e8400-e29b-41d4-a716-446655440000')
    ).toBe(true);
  });

  it('accepts lead detail UUID paths', () => {
    expect(
      isKnownWebAppPath('/leads/550e8400-e29b-41d4-a716-446655440000')
    ).toBe(true);
  });

  it('rejects unknown paths', () => {
    expect(isKnownWebAppPath('/unknown-page')).toBe(false);
    expect(isKnownWebAppPath('/calls/not-a-uuid')).toBe(false);
  });
});
