import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_ROUTES = ['/sign-in'];

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  // Build mutable response so @supabase/ssr can refresh cookies
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT with Supabase Auth (one network call, but necessary)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (isPublicRoute) return response;
    const signInUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // User is authenticated — check super_admin role from app_metadata
  // (populated by set_jwt_claims trigger in migration 007)
  if (!isPublicRoute) {
    const role = (user.app_metadata?.role as string | undefined) ?? null;
    if (role !== 'super_admin') {
      const deniedUrl = new URL('/sign-in', request.url);
      deniedUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(deniedUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
