import 'server-only';
import { revalidatePath } from 'next/cache';
import type { ZodType, ZodTypeDef } from 'zod';
import { ForbiddenError } from './guard';
import { getSession } from './session';
import type { SessionPayload } from './session-token';
import type { ActionResult } from '@/lib/types';

/** Wrap every server action: authenticate, run, and turn any error into a friendly ActionResult. */
export async function guarded(fn: (s: SessionPayload) => Promise<ActionResult>): Promise<ActionResult> {
  const s = await getSession();
  if (!s) return { ok: false, error: 'Your session expired. Please sign in again.', redirectTo: '/login' };
  try {
    const r = await fn(s);
    if (r.ok) revalidatePath('/', 'layout');
    return r;
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: e.message };
    const msg = e instanceof Error ? e.message : 'Something went wrong';
    console.error('[action]', msg);
    return { ok: false, error: msg.length > 160 ? 'Something went wrong. Please try again.' : msg };
  }
}

export function parse<T>(schema: ZodType<T, ZodTypeDef, unknown>, input: unknown): { ok: true; data: T } | { ok: false; result: ActionResult } {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, result: { ok: false, error: r.error.issues[0]?.message ?? 'Please check the form', fieldErrors: r.error.flatten().fieldErrors as Record<string, string[]> } };
}

/** FormData → plain object (last value wins; use getAll() for multi-value fields). */
export const formObject = (fd: FormData): Record<string, FormDataEntryValue> => Object.fromEntries(fd.entries());
