'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { cn } from '@/lib/utils';
import { ADMIN_NAV_ITEMS } from '@/lib/routes';
import { LogOut } from 'lucide-react';

export function AdminNavSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <nav className="flex w-64 flex-col border-r border-gray-800 bg-gray-900">
      <div className="flex h-16 items-center border-b border-gray-800 px-6">
        <span className="text-xl font-bold text-white">Voxori</span>
        <span className="ml-2 rounded bg-blue-600 px-1.5 py-0.5 text-xs font-medium text-white">Admin</span>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto p-3">
        {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-gray-800 p-3">
        <div className="mb-2 px-3 py-1">
          <p className="truncate text-xs text-gray-500">{userEmail}</p>
          <p className="text-xs text-blue-400">Super Admin</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </nav>
  );
}
