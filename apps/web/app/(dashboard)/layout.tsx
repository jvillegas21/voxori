import { redirect } from 'next/navigation';

// In Phase 1, this layout will check Supabase session and redirect to /sign-in if unauthenticated.
// For the scaffold, we render the layout structure.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-64 border-r bg-gray-50 p-4">
        <div className="mb-8">
          <span className="text-xl font-bold text-brand-700">Voxori</span>
        </div>
        <ul className="space-y-1">
          {[
            { href: '/', label: 'Dashboard' },
            { href: '/agent', label: 'My Agent' },
            { href: '/calls', label: 'Call Log' },
            { href: '/schedule', label: 'Schedule' },
            { href: '/integrations', label: 'Integrations' },
            { href: '/analytics', label: 'Analytics' },
            { href: '/settings', label: 'Settings' },
          ].map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
