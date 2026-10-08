import { SignJWT, jwtVerify } from 'jose';

export interface SessionPayload {
  memberId: string;
  slug: string;
}
export const SESSION_COOKIE = 'trio_session';
export const SESSION_DAYS = 14;

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signSession(p: SessionPayload, secret: string, now = Date.now()): Promise<string> {
  return new SignJWT({ mid: p.memberId, slug: p.slug })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(now / 1000) + SESSION_DAYS * 86400)
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret: string): Promise<SessionPayload | null> {
  if (!token || secret.length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] });
    if (typeof payload.mid !== 'string' || typeof payload.slug !== 'string') return null;
    return { memberId: payload.mid, slug: payload.slug };
  } catch {
    return null;
  }
}
