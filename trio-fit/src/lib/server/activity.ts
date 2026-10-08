import 'server-only';
import { db } from './db';

/** Every day on which the member logged anything (workout, food, water, check-in, measurement). Drives the logging streak. */
export async function activityDays(memberId: string): Promise<string[]> {
  const c = db();
  const q = (t: string, col: string) => c.from(t).select(col).eq('member_id', memberId).then((r) => ((r.data ?? []) as unknown as Record<string, string>[]).map((x) => x[col] as string));
  const [a, b, w, ci, m] = await Promise.all([
    c.from('workout_sessions').select('performed_on').eq('member_id', memberId).eq('status', 'completed').then((r) => (r.data ?? []).map((x) => x.performed_on as string)),
    q('food_logs', 'eaten_on'),
    q('water_logs', 'day'),
    q('daily_check_ins', 'day'),
    q('body_measurements', 'measured_on'),
  ]);
  return [...new Set([...a, ...b, ...w, ...ci, ...m])];
}
