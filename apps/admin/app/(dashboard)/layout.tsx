import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { AdminNavSidebar } from '@/components/admin-nav-sidebar';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read-only in RSC */ },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/sign-in');

  return (
    <div className="flex min-h-screen bg-gray-950">
      <AdminNavSidebar userEmail={session.user.email ?? ''} />
      <main className="flex-1 overflow-y-auto p-8 text-white">{children}</main>
    </div>
  );
}
