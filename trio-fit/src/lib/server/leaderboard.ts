import 'server-only';
import { db, must } from './db';
import { listMembers } from './members';
import { chronological, allWorkoutDays, listSessions } from './workouts';
import { timezone } from './settings';
import { dayKey, monthStartKey, weekRange } from '@/lib/domain/time';
import { consistency } from '@/lib/domain/streaks';
import { improvementScore, totalVolume } from '@/lib/domain/workout';
import { rank, type BoardKey, type Period, type Ranked } from '@/lib/domain/leaderboard';
import type { Member } from '@/lib/types';

export interface BoardResult {
  period: Period;
  window: { start: string; end: string };
  members: Member[];
  boards: Record<BoardKey, Ranked[]>;
  mvp: { label: string; memberId: string; value: string }[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function computeBoards(period: Period): Promise<BoardResult> {
  const today = dayKey(new Date(), timezone());
  const window = period === 'week' ? weekRange(today) : period === 'month' ? { start: monthStartKey(today), end: today } : { start: '2000-01-01', end: today };
  const members = await listMembers();
  const [days, xpRows, checkRows, teamEvents] = await Promise.all([
    allWorkoutDays(),
    db().from('xp_transactions').select('member_id, amount, occurred_on').gte('occurred_on', window.start).lte('occurred_on', window.end),
    db().from('daily_check_ins').select('member_id, day, food_log_complete').gte('day', window.start).lte('day', window.end),
    db().from('challenge_events').select('member_id, amount, day, challenges!inner(scope)').eq('challenges.scope', 'team').gte('day', window.start).lte('day', window.end),
  ]);
  const xp = must(xpRows) as { member_id: string; amount: number }[];
  const checks = must(checkRows) as { member_id: string; day: string; food_log_complete: boolean }[];
  const team = must(teamEvents) as unknown as { member_id: string; amount: number }[];

  const entries = { xp: [], consistency: [], improvement: [], nutrition: [], team: [] } as Record<BoardKey, { memberId: string; value: number | null }[]>;
  for (const m of members) {
    const mine = days.filter((d) => d.member_id === m.id).map((d) => d.performed_on);
    entries.xp.push({ memberId: m.id, value: xp.filter((r) => r.member_id === m.id).reduce((a, r) => a + r.amount, 0) });

    const first = [...mine].sort()[0];
    const cStart = window.start > (first ?? '9999') ? window.start : (first ?? window.start);
    entries.consistency.push({ memberId: m.id, value: first ? consistency(mine, m.workout_days, cStart, window.end, today) : null });

    const sessions = await listSessions(m.id, { since: window.start, limit: 300 });
    const vols: Record<string, number[]> = {};
    for (const s of [...sessions].sort(chronological)) {
      if (s.performed_on > window.end) continue;
      for (const w of s.workout_exercises ?? []) if (w.exercises?.kind === 'resistance') (vols[w.exercise_id] ??= []).push(totalVolume(w.exercise_sets.map((x) => ({ weightKg: x.weight_kg == null ? null : Number(x.weight_kg), reps: x.reps }))));
    }
    entries.improvement.push({ memberId: m.id, value: improvementScore(Object.values(vols).map((v) => ({ volumes: v }))) });

    const mc = checks.filter((c) => c.member_id === m.id);
    const firstCheck = [...mc].map((c) => c.day).sort()[0];
    const nStart = window.start > (firstCheck ?? '9999') ? window.start : (firstCheck ?? window.start);
    const span = firstCheck ? Math.max(1, Math.round((Date.parse(window.end < today ? window.end : today) - Date.parse(nStart)) / 86_400_000) + 1) : 0;
    entries.nutrition.push({ memberId: m.id, value: span ? round1((mc.filter((c) => c.food_log_complete).length / span) * 100) : null });

    entries.team.push({ memberId: m.id, value: team.filter((t) => t.member_id === m.id).reduce((a, t) => a + t.amount, 0) });
  }
  const boards = Object.fromEntries((Object.keys(entries) as BoardKey[]).map((k) => [k, rank(entries[k])])) as Record<BoardKey, Ranked[]>;
  const top = (k: BoardKey, unit: string, label: string) => {
    const t = boards[k][0];
    return t && t.rank === 1 && (t.value ?? 0) > 0 ? { label, memberId: t.memberId, value: `${t.value}${unit}` } : null;
  };
  const mvp = [top('xp', ' XP', 'Weekly MVP'), top('consistency', '%', 'Most Consistent'), top('improvement', '%', 'Biggest Personal Improvement'), top('team', ' pts', 'Team Player')].filter((x): x is { label: string; memberId: string; value: string } => x != null);
  return { period, window, members, boards, mvp };
}
