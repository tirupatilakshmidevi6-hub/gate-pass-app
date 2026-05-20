import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/api/register'];

const FACILITIES_ALLOWED = ['/', '/approvals', '/entry-list', '/reports', '/api/'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isFacilitiesAllowed(pathname: string) {
  if (pathname === '/') return true;
  return FACILITIES_ALLOWED.slice(1).some((p) => pathname === p || pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // If already authenticated and trying to access /login, redirect away
  if (pathname === '/login') {
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        const dest = payload.role === 'facilities' ? '/approvals' : '/';
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
    return NextResponse.next();
  }

  // Public paths — allow without auth
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // All other paths need auth
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // Facilities can access: dashboard, approvals, entry-list, reports, and all API routes
  if (payload.role === 'facilities' && !isFacilitiesAllowed(pathname)) {
    return NextResponse.redirect(new URL('/approvals', request.url));
  }

  // Inject user info into request headers so server components can read them
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.id);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-user-name', payload.name);
  requestHeaders.set('x-user-email', payload.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|uploads/).*)'],
};
