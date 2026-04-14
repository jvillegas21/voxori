import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/sign-in', '/sign-up'];

export function middleware(request: NextRequest) {
  const { pathname, hostname } = new URL(request.url);

  // Subdomain resolution: extract tenant from hostname
  // e.g. "acme.voxori.com" -> tenant subdomain "acme"
  const parts = hostname.split('.');
  const isSubdomain =
    parts.length >= 3 && !['www', 'admin'].includes(parts[0] ?? '');
  const subdomain = isSubdomain ? parts[0] : null;

  if (subdomain) {
    request.headers.set('x-tenant-subdomain', subdomain);
  }

  // Auth guard: check for Supabase session cookie
  const sessionCookie =
    request.cookies.get('sb-access-token') ??
    request.cookies.get('supabase-auth-token');

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!sessionCookie && !isPublicRoute) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
