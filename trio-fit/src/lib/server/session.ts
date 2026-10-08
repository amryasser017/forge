import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from './env';
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession, type SessionPayload } from './session-token';

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value, env().sessionSecret);
}

/** Use at the top of every protected page and server action. */
export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect('/login');
  return s;
}

export async function startSession(p: SessionPayload) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(p, env().sessionSecret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
