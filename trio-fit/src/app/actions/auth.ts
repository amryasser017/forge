'use server';

import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/server/db';
import { env, missingConfig } from '@/lib/server/env';
import { verifyGatePassword } from '@/lib/server/password';
import { LOGIN_MAX_FAILURES, LOGIN_WINDOW_MIN, isRateLimited } from '@/lib/server/rate-limit';
import { endSession, startSession } from '@/lib/server/session';
import { loginSchema } from '@/lib/validation';
import type { ActionResult } from '@/lib/types';

export async function loginAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  if (missingConfig().length) return { ok: false, error: 'The server is not configured yet. See the setup notes on this page.' };
  const parsed = loginSchema.safeParse({ password: fd.get('password'), memberSlug: fd.get('memberSlug') });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  const e = env();
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim();
  const ipHash = createHmac('sha256', e.sessionSecret).update(ip).digest('hex').slice(0, 32);

  const since = new Date(Date.now() - LOGIN_WINDOW_MIN * 60_000).toISOString();
  const { count } = await db().from('login_attempts').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).eq('succeeded', false).gte('created_at', since);
  if (isRateLimited(count ?? 0, LOGIN_MAX_FAILURES)) return { ok: false, error: `Too many attempts. Try again in ${LOGIN_WINDOW_MIN} minutes.` };

  const ok = verifyGatePassword(parsed.data.password, { hash: e.gateHash, plain: e.gatePassword });
  await db().from('login_attempts').insert({ ip_hash: ipHash, succeeded: ok });
  if (!ok) return { ok: false, error: 'Wrong password.', fieldErrors: { password: ['Wrong password'] } };

  const { data: member } = await db().from('members').select('id, slug').eq('slug', parsed.data.memberSlug).maybeSingle();
  if (!member) return { ok: false, error: 'Members are not seeded yet. Run the database migrations first.' };
  await startSession({ memberId: member.id as string, slug: member.slug as string });
  redirect('/');
}

export async function logoutAction() {
  await endSession();
  redirect('/login');
}
