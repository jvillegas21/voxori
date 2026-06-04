/**
 * Routes that do not require authentication. Kept in one module so middleware
 * and tests cannot drift.
 */
export const PUBLIC_ROUTES = [
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
] as const;

export type PublicRoute = (typeof PUBLIC_ROUTES)[number];
