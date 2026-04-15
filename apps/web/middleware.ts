import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PUBLIC_ROUTES = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
];

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = new URL(request.url);

  // Subdomain resolution: extract tenant from hostname
  const parts = hostname.split('.');
  const isSubdomain =
    parts.length >= 3 && !['www', 'admin'].includes(parts[0] ?? '');
  const subdomain = isSubdomain ? parts[0] : null;

  let response = NextResponse.next({ request });

  if (subdomain) {
    response.headers.set('x-tenant-subdomain', subdomain);
  }

  // Use Supabase SSR to properly validate the session cookie
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT and refreshes the session if needed
  const { data: { user } } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
