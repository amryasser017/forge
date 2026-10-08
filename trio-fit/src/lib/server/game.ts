import 'server-only';
import { db, must } from './db';
import { getGoals, getMember, getTotalsFor, listMembers } from './members';
import { getRules, timezone } from './settings';
import { getSession, workoutDays } from './workouts';
import { buildSessionReport } from './reports';
import { listChallenges, syncChallengeEvents } from './challenges';
import { saveInsight } from './insights';
import { waterForDay } from './nutrition';
import { motivation } from '@/lib/ai/coach';
import { addDays, dayKey, weekStartKey } from '@/lib/domain/time';
import { coinsForXp } from '@/lib/domain/xp';
import { consistency, isComeback, weekProgress, workoutStreak } from '@/lib/domain/streaks';
import { EMPTY_REWARD, type Member, type RewardSummary } from '@/lib/types';
import type { EventKind, Facts } from '@/lib/domain/messages';

export type Trigger =
  | { type: 'workout'; sessionId: string; performedOn: string }
  | { type: 'measurement'; day: string }
  | { type: 'food'; day: string }
  | { type: 'water'; day: string }
  | { type: 'checkin'; day: string }
  | { type: 'sync' };

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

/**
 * The only place rewards are decided. Server-authoritative: callers pass WHAT happened, never how much it is worth.
 * Every payout uses a deterministic event key + a UNIQUE constraint, so retries, edits and double submits are no-ops.
 * Rewards are not clawed back if a record is later edited or deleted (documented in the README).
 */
export async function runGame(memberId: string, trigger: Trigger): Promise<RewardSummary> {
  const member = (await getMember(memberId)) as Member;
  const [rules, goals, before] = await Promise.all([getRules(), getGoals(memberId), getTotalsFor(memberId)]);
  const today = dayKey(new Date(), timezone());
  const summary: RewardSummary = { ...EMPTY_REWARD, prs: [], achievements: [], challenges: [] };
  const messages: string[] = [];

  const award = async (key: string, amount: number, reason: string, refType?: string, refId?: string, day?: string): Promise<boolean> => {
    const res = await db().rpc('award_xp', { p_member: memberId, p_event_key: key, p_amount: amount, p_coins: coinsForXp(amount, rules), p_reason: reason, p_ref_type: refType ?? null, p_ref_id: refId ?? null, p_day: day ?? today });
    if (res.error) throw new Error(res.error.message);
    return res.data === true;
  };
  const note = async (kind: EventKind, facts: Facts, eventKey: string, polish = false) => {
    if (!member.messages_enabled) return;
    const m = await motivation(kind, facts, member, eventKey, polish);
    await saveInsight({ memberId, kind, body: m.text, source: m.source, eventKey, facts });
    messages.push(m.text);
  };

  if (trigger.type === 'workout') {
    const session = await getSession(trigger.sessionId);
    if (!session || session.member_id !== memberId) throw new Error('Workout not found');
    const report = await buildSessionReport(memberId, session);
    await award(`workout:${memberId}:${trigger.performedOn}`, rules.workout, 'Completed workout', 'workout', trigger.sessionId, trigger.performedOn);
    for (const ex of report.exercises.filter((e) => e.weightPr)) {
      if (await award(`pr:${memberId}:${ex.exerciseId}:${trigger.sessionId}`, rules.personalRecord, `Personal record: ${ex.name}`, 'pr', trigger.sessionId, trigger.performedOn)) {
        summary.prs.push(ex.name);
        await note('pr', { name: member.name, exercise: ex.name, weightKg: ex.maxWeight }, `insight:pr:${memberId}:${ex.exerciseId}:${trigger.sessionId}`, true);
      }
    }
    const days = await workoutDays(memberId);
    const earlier = days.filter((d) => d < trigger.performedOn).pop() ?? null;
    if (isComeback(earlier, trigger.performedOn)) {
      if (await db().rpc('grant_achievement', { p_member: memberId, p_key: 'comeback-champion' }).then((r) => r.data === true)) summary.achievements.push('Comeback Champion');
      await note('comeback', { name: member.name, daysAway: earlier ? Math.round((Date.parse(trigger.performedOn) - Date.parse(earlier)) / 86_400_000) : undefined }, `insight:comeback:${trigger.sessionId}`);
    }
    const streak = workoutStreak(days, member.workout_days, today).current;
    await note('workout', { name: member.name, volumePct: report.volumePct, streak: streak > 1 ? streak : undefined }, `insight:workout:${trigger.sessionId}`);
    if (STREAK_MILESTONES.includes(streak)) await note('streak', { name: member.name, streak }, `insight:streak:${memberId}:${streak}:${today}`);
    const wk = weekProgress(days, member.workout_days, weekStartKey(trigger.performedOn));
    if (wk.planned > 0 && wk.completed >= wk.planned) await note('weekly_goal', { name: member.name, completed: wk.completed, planned: wk.planned }, `insight:weekly:${memberId}:${weekStartKey(trigger.performedOn)}`);
  }

  if (trigger.type === 'measurement') {
    await award(`measurement:${memberId}:${trigger.day}`, rules.measurement, 'Body measurement logged', 'measurement', undefined, trigger.day);
    await note('measurement', { name: member.name }, `insight:measurement:${memberId}:${trigger.day}`);
  }
  if (trigger.type === 'food') await award(`food:${memberId}:${trigger.day}`, rules.foodLogComplete, 'Complete food log', 'food', undefined, trigger.day);
  if (trigger.type === 'water') {
    if ((await waterForDay(memberId, trigger.day)) >= goals.water_target_ml) await award(`water:${memberId}:${trigger.day}`, rules.waterTarget, 'Water target reached', 'water', undefined, trigger.day);
  }

  // Challenges (rebuild progress from source records, then pay completions for everyone who earned them).
  await syncChallengeEvents(memberId, today, goals.water_target_ml);
  const members = await listMembers();
  for (const m of members) if (m.id !== memberId) await syncChallengeEvents(m.id, today, (await getGoals(m.id)).water_target_ml);
  for (const c of await listChallenges(today)) {
    if (c.status === 'upcoming') continue;
    let winners: string[] = [];
    if (c.scope === 'individual') winners = c.participants.filter((p) => (c.progress[p] ?? 0) >= c.target);
    else if (c.scope === 'team') winners = c.total >= c.target ? c.participants.filter((p) => (c.progress[p] ?? 0) > 0) : [];
    else if (c.status === 'ended') winners = c.winnerId ? [c.winnerId] : c.participants.filter((p) => (c.progress[p] ?? 0) > 0);
    for (const w of winners) {
      const paid = await db().rpc('award_xp', { p_member: w, p_event_key: `challenge:${c.id}:${w}`, p_amount: c.xp_reward, p_coins: coinsForXp(c.xp_reward, rules), p_reason: `Challenge: ${c.title}`, p_ref_type: 'challenge', p_ref_id: c.id, p_day: today });
      if (paid.data === true && w === memberId) summary.challenges.push(c.title);
    }
  }

  summary.achievements.push(...(await evaluateAchievements(member, today)));

  const after = await getTotalsFor(memberId);
  summary.xp = after.xp - before.xp;
  summary.coins = after.coins - before.coins;
  if (after.level.level > before.level.level) {
    summary.levelUp = after.level.level;
    await note('level_up', { name: member.name, level: after.level.level }, `insight:level:${memberId}:${after.level.level}`, true);
  }
  summary.message = messages[messages.length - 1] ?? null;
  return summary;
}

async function evaluateAchievements(member: Member, today: string): Promise<string[]> {
  const c = db();
  const [defs, owned, days, prs, checks, teamWins, totals] = await Promise.all([
    c.from('achievements').select('key, name, rule'),
    c.from('member_achievements').select('achievements(key)').eq('member_id', member.id),
    workoutDays(member.id),
    c.from('xp_transactions').select('id', { count: 'exact', head: true }).eq('member_id', member.id).eq('ref_type', 'pr'),
    c.from('daily_check_ins').select('day', { count: 'exact', head: true }).eq('member_id', member.id).eq('food_log_complete', true),
    c.from('xp_transactions').select('ref_id').eq('member_id', member.id).eq('ref_type', 'challenge'),
    getTotalsFor(member.id),
  ]);
  const ownedKeys = new Set((must(owned) as unknown as { achievements: { key: string } }[]).map((o) => o.achievements.key));
  const wonIds = (must(teamWins) as { ref_id: string }[]).map((r) => r.ref_id);
  let teamDone = 0;
  if (wonIds.length) teamDone = (must(await c.from('challenges').select('id').eq('scope', 'team').in('id', wonIds)) as { id: string }[]).length;
  const stats = {
    workouts: days.length,
    workout_streak: workoutStreak(days, member.workout_days, today).longest,
    prs: prs.count ?? 0,
    food_days: checks.count ?? 0,
    team_challenge: teamDone,
    level: totals.level.level,
    consistency_4w: ((): number => {
      const from = addDays(today, -27);
      const done = days.filter((d) => d >= from);
      return done.length >= 8 ? (consistency(days, member.workout_days, from, today, today) ?? 0) : 0;
    })(),
    comeback: 0, // granted at workout time
  } as Record<string, number>;
  const earned: string[] = [];
  for (const d of must(defs) as { key: string; name: string; rule: { type: string; threshold: number } }[]) {
    if (ownedKeys.has(d.key)) continue;
    if ((stats[d.rule.type] ?? 0) >= d.rule.threshold && d.rule.type !== 'comeback') {
      const r = await c.rpc('grant_achievement', { p_member: member.id, p_key: d.key });
      if (r.data === true) earned.push(d.name);
    }
  }
  return earned;
}

