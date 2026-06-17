import { jwtVerify } from 'jose';

export const COOKIE_NAME = 'gp-session';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'nxtwave-gate-pass-secret-key-2026!!'
);

export type EdgeSessionUser = {
  id: string;
  email: string;
  role: string;
  name: string;
};

export async function verifyTokenEdge(token: string): Promise<EdgeSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as EdgeSessionUser;
  } catch {
    return null;
  }
}
