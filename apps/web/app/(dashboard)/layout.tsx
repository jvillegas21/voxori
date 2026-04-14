import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { TrpcProvider } from '@/lib/trpc-provider';
import { NavSidebar } from '@/components/nav-sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only in RSC — session refresh handled by middleware
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/sign-in');
  }

  return (
    <TrpcProvider accessToken={session.access_token}>
      <div className="flex min-h-screen bg-background">
        <NavSidebar userEmail={session.user.email ?? ''} />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </TrpcProvider>
  );
}
