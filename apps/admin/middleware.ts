import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/sign-in'];

export function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Check for Supabase session
  const sessionCookie =
    request.cookies.get('sb-access-token') ??
    request.cookies.get('supabase-auth-token');

  if (!sessionCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // NOTE: Super-admin role check happens in layouts/pages via server-side
  // Supabase session verification. Middleware only checks session existence.

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
