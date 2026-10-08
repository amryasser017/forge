import 'server-only';
import { db, must } from './db';
import { activityDays } from './activity';
import { listChallenges, type ChallengeView } from './challenges';
import { latestMeasurements } from './measurements';
import { allGoals, cosmeticsByKey, getTotals, listMembers, type Totals } from './members';
import { listInsights } from './insights';
import { getCheckIn, waterForDay, foodForDay, macrosOf } from './nutrition';
import { timezone } from './settings';
import { allWorkoutDays } from './workouts';
import { dayKey, weekStartKey } from '@/lib/domain/time';
import { loggingStreak, weekProgress, workoutStreak } from '@/lib/domain/streaks';
import { levelFromXp } from '@/lib/domain/xp';
import type { CheckIn, Cosmetic, Goals, Insight, Measurement, Member } from '@/lib/types';

export interface MemberCard {
  member: Member;
  totals: Totals;
  frame: string | null;
  title: string | null;
  weight: Measurement | null;
  fat: Measurement | null;
  streak: { current: number; longest: number };
  logging: number;
  week: { planned: number; completed: number; extra: number };
  weekXp: number;
  trainedToday: boolean;
}
export interface Dashboard {
  today: string;
  cards: MemberCard[];
  challenges: ChallengeView[];
  prs: { member_id: string; reason: string; occurred_on: string }[];
  achievements: { member_id: string; earned_at: string; name: string; icon: string }[];
  insights: Insight[];
  me: { water: number; goals: Goals; checkIn: CheckIn | null; calories: number; foodCount: number };
}

export async function getDashboard(meId: string): Promise<Dashboard> {
  const today = dayKey(new Date(), timezone());
  const wk = weekStartKey(today);
  const [members, totals, latest, days, goals, cos, challenges] = await Promise.all([listMembers(), getTotals(), latestMeasurements(), allWorkoutDays(), allGoals(), cosmeticsByKey(), listChallenges(today)]);
  const [xpWeek, prs, ach, insights, water, checkIn, food] = await Promise.all([
    db().from('xp_transactions').select('member_id, amount').gte('occurred_on', wk).lte('occurred_on', today),
    db().from('xp_transactions').select('member_id, reason, occurred_on').eq('ref_type', 'pr').order('created_at', { ascending: false }).limit(6),
    db().from('member_achievements').select('member_id, earned_at, achievements(name, icon)').order('earned_at', { ascending: false }).limit(6),
    listInsights({ limit: 8 }),
    waterForDay(meId, today),
    getCheckIn(meId, today),
    foodForDay(meId, today),
  ]);
  const weekXp = (must(xpWeek) as { member_id: string; amount: number }[]);
  const cards: MemberCard[] = [];
  for (const m of members) {
    const mine = days.filter((d) => d.member_id === m.id).map((d) => d.performed_on);
    const act = await activityDays(m.id);
    cards.push({
      member: m,
      totals: totals[m.id] ?? { xp: 0, coins: 0, level: levelFromXp(0) },
      frame: m.equipped_frame ? ((cos[m.equipped_frame] as Cosmetic | undefined)?.value ?? null) : null,
      title: m.equipped_title ? ((cos[m.equipped_title] as Cosmetic | undefined)?.value ?? null) : null,
      weight: latest[m.id]?.weight ?? null,
      fat: latest[m.id]?.fat ?? null,
      streak: workoutStreak(mine, m.workout_days, today),
      logging: loggingStreak(act, today),
      week: weekProgress(mine, m.workout_days, wk),
      weekXp: weekXp.filter((x) => x.member_id === m.id).reduce((a, x) => a + x.amount, 0),
      trainedToday: mine.includes(today),
    });
  }
  return {
    today,
    cards,
    challenges: challenges.filter((c) => c.status === 'active').slice(0, 4),
    prs: must(prs) as Dashboard['prs'],
    achievements: (must(ach) as unknown as { member_id: string; earned_at: string; achievements: { name: string; icon: string } }[]).map((a) => ({ member_id: a.member_id, earned_at: a.earned_at, name: a.achievements.name, icon: a.achievements.icon })),
    insights,
    me: { water, goals: goals[meId] as Goals, checkIn, calories: macrosOf(food).calories, foodCount: food.length },
  };
}
