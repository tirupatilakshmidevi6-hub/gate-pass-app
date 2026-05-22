import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

const PUBLIC_PATHS = [
  '/login', '/register', '/signup', '/forgot-password', '/reset-password',
  '/api/auth', '/api/register', '/api/signup',
];
const SUPER_ADMIN_ONLY = ['/users', '/api/users'];
const ADMIN_ONLY_PATHS = ['/activity', '/api/activity'];
const FACILITIES_ALLOWED = ['/', '/approvals', '/entry-list', '/reports', '/api/'];

function isPublic(p: string) {
  return PUBLIC_PATHS.some((pub) => p === pub || p.startsWith(pub + '/'));
}
function isSuperAdminOnly(p: string) {
  return SUPER_ADMIN_ONLY.some((r) => p === r || p.startsWith(r + '/'));
}
function isAdminOnly(p: string) {
  return ADMIN_ONLY_PATHS.some((r) => p === r || p.startsWith(r + '/'));
}
function isFacilitiesAllowed(p: string) {
  if (p === '/') return true;
  return FACILITIES_ALLOWED.slice(1).some((r) => p === r || p.startsWith(r));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

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

  if (isPublic(pathname)) return NextResponse.next();

  if (!token) return NextResponse.redirect(new URL('/login', request.url));

  const payload = await verifyToken(token);
  if (!payload) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // Super-admin-only routes
  if (isSuperAdminOnly(pathname) && payload.role !== 'super_admin') {
    return NextResponse.redirect(new URL(payload.role === 'facilities' ? '/approvals' : '/', request.url));
  }

  // Admin-only routes (super_admin + admin, not facilities)
  if (isAdminOnly(pathname) && payload.role === 'facilities') {
    return NextResponse.redirect(new URL('/approvals', request.url));
  }

  // Facilities restrictions
  if (payload.role === 'facilities' && !isFacilitiesAllowed(pathname)) {
    return NextResponse.redirect(new URL('/approvals', request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id',    payload.id);
  requestHeaders.set('x-user-role',  payload.role);
  requestHeaders.set('x-user-name',  payload.name);
  requestHeaders.set('x-user-email', payload.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|uploads/).*)'],
};
