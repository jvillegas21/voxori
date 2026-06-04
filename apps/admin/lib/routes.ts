import type { LucideIcon } from 'lucide-react';
import { Users, Bot, Phone, CreditCard, Settings } from 'lucide-react';

import { ADMIN_PUBLIC_ROUTES } from './public-routes';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { href: '/accounts', label: 'Accounts', icon: Users },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/calls', label: 'Calls', icon: Phone },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ADMIN_STATIC_PATHS = new Set<string>([
  '/',
  ...ADMIN_NAV_ITEMS.map((i) => i.href),
  ...ADMIN_PUBLIC_ROUTES,
]);

/** Returns true if `pathname` matches a known admin route (static or account detail). */
export function isKnownAdminAppPath(pathname: string): boolean {
  if (ADMIN_STATIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/accounts/')) {
    const rest = pathname.slice('/accounts/'.length);
    return UUID_RE.test(rest);
  }
  return false;
}
