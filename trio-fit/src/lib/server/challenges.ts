import 'server-only';
import { db, must } from './db';
import { CHALLENGE_METRICS, battleWinner, isComplete, progressPct, validateChallengeDraft, type ChallengeDraft, type ChallengeMetric } from '@/lib/domain/challenges';
import { weekRange } from '@/lib/domain/time';
import type { Challenge } from '@/lib/types';
import type { XpRules } from '@/lib/domain/xp';

export interface ChallengeView extends Challenge {
  participants: string[];
  /** progress per member id */
  progress: Record<string, number>;
  total: number;
  pct: number;
  complete: boolean;
  status: 'upcoming' | 'active' | 'ended';
  winnerId?: string | null;
}

export async function listChallenges(today: string): Promise<ChallengeView[]> {
  const rows = must(await db().from('challenges').select('*, challenge_participants(member_id)').order('starts_on', { ascending: false }).limit(60)) as unknown as (Challenge & { challenge_participants: { member_id: string }[] })[];
  if (rows.length === 0) return [];
  const events = must(await db().from('challenge_events').select('challenge_id, member_id, amount').in('challenge_id', rows.map((r) => r.id))) as { challenge_id: string; member_id: string; amount: number }[];
  return rows.map(({ challenge_participants, ...c }) => {
    const participants = challenge_participants.map((p) => p.member_id);
    const progress: Record<string, number> = Object.fromEntries(participants.map((p) => [p, 0]));
    for (const e of events) if (e.challenge_id === c.id) progress[e.member_id] = (progress[e.member_id] ?? 0) + e.amount;
    const total = Object.values(progress).reduce((a, b) => a + b, 0);
    const mine = c.scope === 'team' ? total : Math.max(0, ...Object.values(progress));
    const status = today < c.starts_on ? 'upcoming' : today > c.ends_on ? 'ended' : 'active';
    let winnerId: string | null | undefined;
    if (c.scope === 'battle' && participants.length === 2) winnerId = battleWinner({ memberId: participants[0] as string, progress: progress[participants[0] as string] ?? 0 }, { memberId: participants[1] as string, progress: progress[participants[1] as string] ?? 0 });
    return { ...c, participants, progress, total, pct: progressPct(mine, c.target), complete: c.scope === 'battle' ? status === 'ended' : isComplete(mine, c.target), status, winnerId };
  });
}

export async function createChallenge(creatorId: string, allMemberIds: string[], d: ChallengeDraft & { isBoss?: boolean; opponentId?: string }): Promise<string> {
  const err = validateChallengeDraft(d);
  if (err) throw new Error(err);
  let participants = [creatorId];
  if (d.scope === 'team') participants = allMemberIds;
  if (d.scope === 'battle') {
    if (!d.opponentId || d.opponentId === creatorId || !allMemberIds.includes(d.opponentId)) throw new Error('Choose a different member to battle');
    participants = [creatorId, d.opponentId];
  }
  const row = must(await db().from('challenges').insert({ scope: d.scope, title: d.title, description: d.description || null, metric: d.metric, target: d.target, starts_on: d.startsOn, ends_on: d.endsOn, xp_reward: d.xpReward, is_boss: !!d.isBoss, created_by: creatorId }).select('id').single()) as { id: string };
  must(await db().from('challenge_participants').insert(participants.map((m) => ({ challenge_id: row.id, member_id: m }))));
  return row.id;
}

/** Safe default weekly challenges based on the member's own schedule. */
export function defaultWeeklyChallenges(today: string, plannedDaysPerWeek: number, rules: XpRules): (ChallengeDraft & { isBoss?: boolean })[] {
  const { start, end } = weekRange(today);
  const sessions = Math.max(1, Math.min(CHALLENGE_METRICS.workout_sessions.maxTarget, plannedDaysPerWeek || 3));
  return [
    { title: 'Show up this week', description: `Complete ${sessions} workouts this week.`, scope: 'individual', metric: 'workout_sessions', target: sessions, startsOn: start, endsOn: end, xpReward: rules.weeklyChallenge },
    { title: 'Honest kitchen', description: 'Log a complete food day on 4 days this week.', scope: 'individual', metric: 'food_log_days', target: 4, startsOn: start, endsOn: end, xpReward: rules.weeklyChallenge },
    { title: 'Trio boss: 12 sessions together', description: 'The three of you finish 12 workouts this week combined.', scope: 'team', metric: 'workout_sessions', target: 12, startsOn: start, endsOn: end, xpReward: rules.teamChallenge, isBoss: true },
  ];
}

interface Sources {
  sessions: { id: string; day: string }[];
  foodDays: string[];
  checkinDays: string[];
  waterDays: string[];
  measurements: { id: string; day: string }[];
  prs: { key: string; day: string }[];
}
async function loadSources(memberId: string, waterTarget: number): Promise<Sources> {
  const c = db();
  const [s, ci, w, m, p] = await Promise.all([
    c.from('workout_sessions').select('id, performed_on').eq('member_id', memberId).eq('status', 'completed'),
    c.from('daily_check_ins').select('day, food_log_complete').eq('member_id', memberId),
    c.from('water_logs').select('day, ml').eq('member_id', memberId),
    c.from('body_measurements').select('id, measured_on').eq('member_id', memberId),
    c.from('xp_transactions').select('event_key, occurred_on').eq('member_id', memberId).eq('ref_type', 'pr'),
  ]);
  const water: Record<string, number> = {};
  for (const r of (must(w) as { day: string; ml: number }[])) water[r.day] = (water[r.day] ?? 0) + r.ml;
  const checks = must(ci) as { day: string; food_log_complete: boolean }[];
  return {
    sessions: (must(s) as { id: string; performed_on: string }[]).map((r) => ({ id: r.id, day: r.performed_on })),
    foodDays: checks.filter((r) => r.food_log_complete).map((r) => r.day),
    checkinDays: checks.map((r) => r.day),
    waterDays: Object.entries(water).filter(([, ml]) => ml >= waterTarget).map(([d]) => d),
    measurements: (must(m) as { id: string; measured_on: string }[]).map((r) => ({ id: r.id, day: r.measured_on })),
    prs: (must(p) as { event_key: string; occurred_on: string }[]).map((r) => ({ key: r.event_key, day: r.occurred_on })),
  };
}
function contributions(metric: ChallengeMetric, src: Sources): { key: string; day: string }[] {
  switch (metric) {
    case 'workout_sessions': return src.sessions.map((s) => ({ key: `ws:${s.id}`, day: s.day }));
    case 'food_log_days': return src.foodDays.map((d) => ({ key: `food:${d}`, day: d }));
    case 'water_days': return src.waterDays.map((d) => ({ key: `water:${d}`, day: d }));
    case 'measurements': return src.measurements.map((m) => ({ key: `meas:${m.id}`, day: m.day }));
    case 'personal_records': return src.prs.map((p) => ({ key: p.key, day: p.day }));
    case 'checkins': return src.checkinDays.map((d) => ({ key: `ci:${d}`, day: d }));
  }
}

/**
 * Rebuild this member's challenge progress from source records. Because keys are derived from the underlying
 * records, re-running (or editing/deleting a record) can never double count; removed records drop out of progress.
 */
export async function syncChallengeEvents(memberId: string, today: string, waterTarget: number): Promise<void> {
  const parts = must(await db().from('challenge_participants').select('challenges(*)').eq('member_id', memberId)) as unknown as { challenges: Challenge }[];
  const active = parts.map((p) => p.challenges).filter((c) => c.starts_on <= today);
  if (active.length === 0) return;
  const src = await loadSources(memberId, waterTarget);
  for (const c of active) {
    const last = c.ends_on < today ? c.ends_on : today;
    const wanted = contributions(c.metric as ChallengeMetric, src).filter((x) => x.day >= c.starts_on && x.day <= last);
    const keys = new Map(wanted.map((w) => [`${c.id}:${memberId}:${w.key}`, w.day]));
    const existing = must(await db().from('challenge_events').select('id, event_key').eq('challenge_id', c.id).eq('member_id', memberId)) as { id: string; event_key: string }[];
    const stale = existing.filter((e) => !keys.has(e.event_key)).map((e) => e.id);
    if (stale.length) must(await db().from('challenge_events').delete().in('id', stale));
    const have = new Set(existing.map((e) => e.event_key));
    const fresh = [...keys].filter(([k]) => !have.has(k)).map(([k, day]) => ({ challenge_id: c.id, member_id: memberId, day, amount: 1, event_key: k }));
    if (fresh.length) await db().from('challenge_events').upsert(fresh, { onConflict: 'event_key', ignoreDuplicates: true });
  }
}

