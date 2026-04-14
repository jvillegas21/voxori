export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <nav className="w-64 border-r border-gray-800 p-4">
        <div className="mb-8">
          <span className="text-lg font-bold">Voxori</span>
          <span className="ml-2 rounded bg-red-900 px-1.5 py-0.5 text-xs text-red-200">
            ADMIN
          </span>
        </div>
        <ul className="space-y-1">
          {[
            { href: '/accounts', label: 'Accounts' },
            { href: '/agents', label: 'Agents' },
            { href: '/calls', label: 'Call Log' },
            { href: '/billing', label: 'Billing' },
            { href: '/settings', label: 'Settings' },
          ].map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="block rounded px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
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
