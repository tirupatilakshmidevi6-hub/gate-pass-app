import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'nxtwave-gate-pass-secret-key-2026!!'
);

// Reserved system roles — only one account allowed per role.
// All other role strings are custom "Other" roles that need admin approval.
export const RESERVED_ROLES = ['admin', 'ta', 'facilities'] as const;
export type ReservedRole = typeof RESERVED_ROLES[number];
export type UserRole = string;

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string;
};

export function isReservedRole(role: string): boolean {
  return (RESERVED_ROLES as readonly string[]).includes(role);
}

export function canManageEntries(role: string): boolean {
  return role === 'admin' || role === 'ta';
}

export const COOKIE_NAME = 'gp-session';

export const ROLE_LABELS: Record<string, string> = {
  admin:      'Admin',
  ta:         'TA',
  facilities: 'Facilities Team',
};

export const STATUS_LABELS: Record<string, string> = {
  active:           'Active',
  pending_approval: 'Pending Approval',
  rejected:         'Rejected',
  inactive:         'Inactive',
};

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
