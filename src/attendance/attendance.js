// Gym days, weekly goal and week streak rules (Attendance & Goals, C7).
import { todayStr, weekStart, ymd } from '../shared/dates';

export const WEEK_GOAL = 3; // default gym days per week (users can change it in Settings)

export function weekStreak(dates, goal = WEEK_GOAL) {
  const counts = {};
  [...new Set(dates)].forEach((d) => {
    const w = weekStart(d);
    counts[w] = (counts[w] || 0) + 1;
  });
  const cur = new Date(weekStart(todayStr()) + 'T00:00:00');
  let streak = 0;
  if ((counts[ymd(cur)] || 0) >= goal) streak = 1;
  cur.setDate(cur.getDate() - 7);
  while ((counts[ymd(cur)] || 0) >= goal) {
    streak += 1;
    cur.setDate(cur.getDate() - 7);
  }
  return streak;
}

/** Weekly goal = days in the plan (non-rest, with exercises); with no plan, the athlete's default gym days (3 if never set). */
export const weeklyGoal = (planGoalValue, profileGoal) => planGoalValue || (profileGoal ?? WEEK_GOAL);

/**
 * Attendance numbers for the current Saturday-Friday week.
 * logDates = dates that have a logged set, checkinIds = dates with a manual check-in.
 */
export function attendanceSummary({ logDates, checkinIds, goal, today = todayStr() }) {
  const start = weekStart(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return ymd(d);
  });
  const logged = new Set(logDates);
  const checked = new Set(checkinIds);
  const trained = new Set([...logged, ...checked]);
  const daysThisWeek = weekDays.filter((d) => trained.has(d)).length;
  const streak = weekStreak([...trained], goal);
  /** done / missed / today / future, and whether the day can be toggled by the athlete. */
  const dayState = (d) => {
    const done = trained.has(d);
    const locked = logged.has(d) && !checked.has(d);
    const state = done ? 'done' : !done && d < today ? 'missed' : d === today ? 'today' : 'future';
    return { state, done, locked, disabled: locked || d > today };
  };
  return { weekDays, logged, checked, trained, daysThisWeek, streak, today, dayState };
}
