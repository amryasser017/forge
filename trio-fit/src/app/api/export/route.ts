import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { getSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/** Downloads everything that belongs to the signed-in member as JSON. */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const c = db();
  const mine = (t: string, col = 'member_id') => c.from(t).select('*').eq(col, s.memberId).then((r) => r.data ?? []);
  const [member, goals, body, sessions, food, water, checkins, xp, ach, insights] = await Promise.all([
    c.from('members').select('*').eq('id', s.memberId).maybeSingle().then((r) => r.data),
    mine('member_goals'),
    mine('body_measurements'),
    c.from('workout_sessions').select('*, workout_exercises(*, exercise_sets(*))').eq('member_id', s.memberId).then((r) => r.data ?? []),
    mine('food_logs'),
    mine('water_logs'),
    mine('daily_check_ins'),
    mine('xp_transactions'),
    c.from('member_achievements').select('earned_at, achievements(name)').eq('member_id', s.memberId).then((r) => r.data ?? []),
    mine('ai_insights'),
  ]);
  const body_ = JSON.stringify({ exportedAt: new Date().toISOString(), member, goals, bodyMeasurements: body, workouts: sessions, foodLogs: food, waterLogs: water, checkIns: checkins, xpTransactions: xp, achievements: ach, insights }, null, 2);
  return new NextResponse(body_, { headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="trio-fit-${s.slug}.json"`, 'cache-control': 'no-store' } });
}
