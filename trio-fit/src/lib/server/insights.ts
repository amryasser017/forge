import 'server-only';
import { db, must } from './db';
import type { Insight } from '@/lib/types';

/** Idempotent: the same event_key never produces a second message. */
export async function saveInsight(i: { memberId: string | null; kind: string; body: string; source: 'ai' | 'rules'; eventKey: string; facts?: unknown }) {
  await db().from('ai_insights').upsert({ member_id: i.memberId, kind: i.kind, body: i.body, source: i.source, event_key: i.eventKey, facts: i.facts ?? null }, { onConflict: 'event_key', ignoreDuplicates: true });
}
export async function listInsights(opts: { memberId?: string; limit?: number } = {}): Promise<(Insight & { member_name?: string })[]> {
  let q = db().from('ai_insights').select('*').order('created_at', { ascending: false }).limit(opts.limit ?? 10);
  if (opts.memberId) q = q.eq('member_id', opts.memberId);
  return must(await q) as Insight[];
}
