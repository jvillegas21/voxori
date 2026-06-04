import { test, expect } from '@playwright/test';

const publicPaths = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'] as const;

test.describe('public pages', () => {
  for (const path of publicPaths) {
    test(`GET ${path} returns 200`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.ok()).toBeTruthy();
    });
  }
});

test.describe('protected routes redirect when unauthenticated', () => {
  test('dashboard redirects to sign-in with redirectTo', async ({ page }) => {
    await page.goto('/agent');
    await page.waitForURL(/\/sign-in/);
    const url = new URL(page.url());
    expect(url.pathname).toBe('/sign-in');
    expect(url.searchParams.get('redirectTo')).toBe('/agent');
  });

  test('onboarding page redirects to sign-in', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForURL(/\/sign-in/);
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });

  test('calls list redirects to sign-in', async ({ page }) => {
    await page.goto('/calls');
    await page.waitForURL(/\/sign-in/);
    expect(new URL(page.url()).pathname).toBe('/sign-in');
  });
});
