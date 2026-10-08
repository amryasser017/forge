'use server';

import { z } from 'zod';
import { guarded, formObject, parse } from '@/lib/server/action';
import { db, must } from '@/lib/server/db';
import { createChallenge, defaultWeeklyChallenges, listChallenges } from '@/lib/server/challenges';
import { listMembers } from '@/lib/server/members';
import { getRules, timezone } from '@/lib/server/settings';
import { runGame } from '@/lib/server/game';
import { suggestChallenges } from '@/lib/ai/coach';
import { dayKey } from '@/lib/domain/time';
import { challengeSchema } from '@/lib/validation';
import type { ChallengeDraft, ChallengeMetric } from '@/lib/domain/challenges';
import type { ActionResult } from '@/lib/types';

async function allIds() {
  return (await listMembers()).map((m) => m.id);
}

export async function createChallengeAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guarded(async (s) => {
    const p = parse(challengeSchema, formObject(fd));
    if (!p.ok) return p.result;
    const rules = await getRules();
    const d = p.data;
    const xp = d.xpReward ?? (d.scope === 'team' ? rules.teamChallenge : rules.weeklyChallenge);
    await createChallenge(s.memberId, await allIds(), { title: d.title, description: d.description ?? '', scope: d.scope, metric: d.metric as ChallengeMetric, target: d.target, startsOn: d.startsOn, endsOn: d.endsOn, xpReward: xp, isBoss: fd.get('isBoss') === 'on', opponentId: d.opponentId });
    await runGame(s.memberId, { type: 'sync' });
    return { ok: true, message: d.scope === 'battle' ? 'Battle started!' : 'Challenge created' };
  });
}

export async function createWeeklyDefaultsAction(): Promise<ActionResult> {
  return guarded(async (s) => {
    const today = dayKey(new Date(), timezone());
    const me = (await listMembers()).find((m) => m.id === s.memberId);
    const rules = await getRules();
    const existing = await listChallenges(today);
    let made = 0;
    for (const d of defaultWeeklyChallenges(today, me?.workout_days.length ?? 3, rules)) {
      if (existing.some((c) => c.title === d.title && c.starts_on === d.startsOn && (c.scope === 'team' || c.participants.includes(s.memberId)))) continue;
      await createChallenge(s.memberId, await allIds(), d);
      made += 1;
    }
    await runGame(s.memberId, { type: 'sync' });
    return { ok: true, message: made ? `${made} weekly challenge${made > 1 ? 's' : ''} created` : 'This week\'s challenges already exist' };
  });
}

export async function suggestChallengesAction(): Promise<{ drafts: ChallengeDraft[]; source: 'ai' | 'rules'; error?: string }> {
  const r = await guarded(async (s) => ({ ok: true, data: await suggestChallenges(s.memberId, dayKey(new Date(), timezone())) }));
  return r.ok ? (r.data as { drafts: ChallengeDraft[]; source: 'ai' | 'rules' }) : { drafts: [], source: 'rules', error: r.error };
}

const draftSchema = z.object({ title: z.string().min(3).max(60), description: z.string().max(200).optional(), metric: z.string(), target: z.number().int(), startsOn: z.string(), endsOn: z.string() });
export async function acceptSuggestionAction(draft: unknown): Promise<ActionResult> {
  return guarded(async (s) => {
    const p = parse(draftSchema, draft);
    if (!p.ok) return p.result;
    const rules = await getRules();
    // Re-validated on the server; the client cannot choose the reward.
    await createChallenge(s.memberId, await allIds(), { title: p.data.title, description: p.data.description ?? '', scope: 'individual', metric: p.data.metric as ChallengeMetric, target: p.data.target, startsOn: p.data.startsOn, endsOn: p.data.endsOn, xpReward: rules.weeklyChallenge });
    await runGame(s.memberId, { type: 'sync' });
    return { ok: true, message: 'Challenge added' };
  });
}

export async function buyCosmeticAction(itemId: string): Promise<ActionResult> {
  return guarded(async (s) => {
    if (!z.string().uuid().safeParse(itemId).success) return { ok: false, error: 'Unknown item' };
    const r = await db().rpc('buy_cosmetic', { p_member: s.memberId, p_item: itemId });
    if (r.error) return { ok: false, error: r.error.message };
    if (r.data === 'insufficient') return { ok: false, error: 'Not enough coins yet. Keep training!' };
    if (r.data === 'owned') return { ok: false, error: 'You already own this' };
    if (r.data !== 'ok') return { ok: false, error: 'Item not found' };
    return { ok: true, message: 'Unlocked!' };
  });
}

export async function equipCosmeticAction(kind: 'title' | 'frame', key: string | null): Promise<ActionResult> {
  return guarded(async (s) => {
    if (key) {
      const { data: item } = await db().from('cosmetic_items').select('id, kind, cost_coins').eq('key', key).maybeSingle();
      if (!item || item.kind !== kind) return { ok: false, error: 'Unknown item' };
      if (item.cost_coins > 0) {
        const { data: own } = await db().from('member_cosmetics').select('item_id').eq('member_id', s.memberId).eq('item_id', item.id).maybeSingle();
        if (!own) return { ok: false, error: 'Unlock this first' };
      }
    }
    must(await db().from('members').update(kind === 'title' ? { equipped_title: key } : { equipped_frame: key }).eq('id', s.memberId));
    return { ok: true, message: key ? 'Equipped' : 'Removed' };
  });
}
