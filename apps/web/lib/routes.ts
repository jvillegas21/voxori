import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Bot,
  Phone,
  Users,
  CalendarCheck,
  Building2,
  Puzzle,
  BarChart3,
  Settings,
  Rocket,
} from 'lucide-react';

import { PUBLIC_ROUTES } from './public-routes';

export interface WebNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Primary dashboard navigation — single source of truth for sidebar + route tests. */
export const WEB_NAV_ITEMS: readonly WebNavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/onboarding', label: 'Onboarding', icon: Rocket },
  { href: '/agent', label: 'My Agent', icon: Bot },
  { href: '/calls', label: 'Calls', icon: Phone },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/showings', label: 'Showings', icon: CalendarCheck },
  { href: '/listings', label: 'Listings', icon: Building2 },
  { href: '/integrations', label: 'Integrations', icon: Puzzle },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

/** Paths linked from onboarding, auth, or feature pages (not necessarily in the main nav). */
export const WEB_IN_APP_LINK_PATHS = [
  ...PUBLIC_ROUTES,
  '/integrations',
  '/calls',
  '/onboarding',
  '/leads',
  '/showings',
  '/schedule',
  '/landing',
  '/pricing',
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const WEB_STATIC_PATHS = new Set<string>([
  ...WEB_NAV_ITEMS.map((i) => i.href),
  ...PUBLIC_ROUTES,
  '/landing',
  '/pricing',
  '/waitlist',
  '/about',
  '/how-it-works',
  '/schedule',
]);

/**
 * Returns true if `pathname` matches a known app route (static or dynamic detail pages).
 */
export function isKnownWebAppPath(pathname: string): boolean {
  if (WEB_STATIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/calls/')) {
    const rest = pathname.slice('/calls/'.length);
    return UUID_RE.test(rest);
  }
  if (pathname.startsWith('/leads/')) {
    const rest = pathname.slice('/leads/'.length);
    return UUID_RE.test(rest);
  }
  return false;
}
