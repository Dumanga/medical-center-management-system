import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './src/lib/auth';

const PROTECTED_ROUTES = ['/dashboard', '/patients', '/treatments', '/appointments', '/sessions', '/reporting'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (pathname.startsWith('/login')) {
    if (!token) {
      return NextResponse.next();
    }
    const session = await verifySessionToken(token);
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    const response = NextResponse.next();
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const session = await verifySessionToken(token);

    if (!session) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard/:path*', '/patients/:path*', '/treatments/:path*', '/appointments/:path*', '/sessions/:path*', '/reporting/:path*'],
};
