import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge as verifyToken, COOKIE_NAME } from '@/lib/auth-edge';

const PUBLIC_PATHS = [
  '/login', '/register', '/signup', '/forgot-password', '/reset-password',
  '/api/auth', '/api/register', '/api/signup',
];

// System roles with full/partial application access
const RESERVED = ['admin', 'ta', 'facilities'];

// Paths only Admin can access
const ADMIN_ONLY = ['/users', '/api/users', '/settings', '/api/settings'];

// Paths Facilities can access
const FACILITIES_ALLOWED = ['/', '/approvals', '/entry-list', '/reports'];
const FACILITIES_API_ALLOWED = ['/api/entries', '/api/approvals', '/api/auth', '/api/notifications', '/api/activity'];

function isPublic(p: string) {
  return PUBLIC_PATHS.some((pub) => p === pub || p.startsWith(pub + '/'));
}

function isAdminOnly(p: string) {
  return ADMIN_ONLY.some((r) => p === r || p.startsWith(r + '/'));
}

function isFacilitiesAllowed(p: string) {
  if (FACILITIES_ALLOWED.some((r) => p === r || p.startsWith(r + '/'))) return true;
  if (FACILITIES_API_ALLOWED.some((r) => p.startsWith(r)))             return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Redirect already-authenticated users away from login
  if (pathname === '/login') {
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        let dest = '/';
        if (payload.role === 'facilities')           dest = '/approvals';
        else if (!RESERVED.includes(payload.role))   dest = '/welcome';
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

  // Custom ("Other") roles: only /welcome + auth/notifications APIs
  if (!RESERVED.includes(payload.role)) {
    if (
      !pathname.startsWith('/welcome') &&
      !pathname.startsWith('/api/auth') &&
      !pathname.startsWith('/api/notifications')
    ) {
      return NextResponse.redirect(new URL('/welcome', request.url));
    }
    const h = new Headers(request.headers);
    h.set('x-user-id',    payload.id);
    h.set('x-user-role',  payload.role);
    h.set('x-user-name',  payload.name);
    h.set('x-user-email', payload.email);
    return NextResponse.next({ request: { headers: h } });
  }

  // Admin-only paths
  if (isAdminOnly(pathname) && payload.role !== 'admin') {
    return NextResponse.redirect(new URL(payload.role === 'facilities' ? '/approvals' : '/', request.url));
  }

  // Facilities: only their allowed paths
  if (payload.role === 'facilities' && !isFacilitiesAllowed(pathname)) {
    return NextResponse.redirect(new URL('/approvals', request.url));
  }

  // TA: no admin-management paths
  if (payload.role === 'ta' && isAdminOnly(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const h = new Headers(request.headers);
  h.set('x-user-id',    payload.id);
  h.set('x-user-role',  payload.role);
  h.set('x-user-name',  payload.name);
  h.set('x-user-email', payload.email);

  return NextResponse.next({ request: { headers: h } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|uploads/).*)'],
};
