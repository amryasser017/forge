import { addDays, dayOfWeek, daysBetween, rangeKeys } from './time';

/**
 * Streak rules (documented in README):
 * - A *planned* day is a weekday the member scheduled for training. Rest days are all other weekdays.
 * - Workout streak = consecutive days with a completed workout, where a rest day with no workout does NOT break the
 *   streak, but a planned day with no workout does. Today never breaks the streak while it is still pending.
 * - The CURRENT schedule is applied to the whole history (changing the schedule re-evaluates old days).
 * - A workout on a rest day still counts toward the streak.
 */
export function workoutStreak(completed: Iterable<string>, plannedWeekdays: number[], today: string): { current: number; longest: number } {
  const done = new Set(completed);
  if (done.size === 0) return { current: 0, longest: 0 };
  const planned = new Set(plannedWeekdays);
  const earliest = [...done].sort()[0] as string;

  // current: walk backwards
  let current = 0;
  for (let k = today; k >= earliest; k = addDays(k, -1)) {
    if (done.has(k)) current += 1;
    else if (planned.has(dayOfWeek(k)) && k !== today) break;
  }

  // longest: walk forwards
  let longest = 0;
  let run = 0;
  for (const k of rangeKeys(earliest, today)) {
    if (done.has(k)) {
      run += 1;
      longest = Math.max(longest, run);
    } else if (planned.has(dayOfWeek(k)) && k !== today) run = 0;
  }
  return { current, longest };
}

/** Logging streak = consecutive days with ANY logged activity. Today does not break it while pending. */
export function loggingStreak(logged: Iterable<string>, today: string): number {
  const set = new Set(logged);
  let n = 0;
  let k = set.has(today) ? today : addDays(today, -1);
  while (set.has(k)) {
    n += 1;
    k = addDays(k, -1);
  }
  return n;
}

/** Share of planned days (up to and including `end`, but not future days) that had a completed workout. 0–100, null if nothing was planned. */
export function consistency(completed: Iterable<string>, plannedWeekdays: number[], start: string, end: string, today: string): number | null {
  const done = new Set(completed);
  const planned = new Set(plannedWeekdays);
  const last = end < today ? end : today;
  if (last < start) return null;
  const days = rangeKeys(start, last).filter((k) => planned.has(dayOfWeek(k)));
  if (days.length === 0) return null;
  const hit = days.filter((k) => done.has(k)).length;
  return Math.round((hit / days.length) * 1000) / 10;
}

export function weekProgress(completed: Iterable<string>, plannedWeekdays: number[], weekStart: string) {
  const done = new Set(completed);
  const planned = new Set(plannedWeekdays);
  const days = rangeKeys(weekStart, addDays(weekStart, 6));
  const plannedDays = days.filter((k) => planned.has(dayOfWeek(k)));
  return { planned: plannedDays.length, completed: plannedDays.filter((k) => done.has(k)).length, extra: days.filter((k) => done.has(k) && !planned.has(dayOfWeek(k))).length };
}

/** A comeback = a workout after at least `gapDays` days without one (and at least one earlier workout). */
export function isComeback(previousWorkoutDay: string | null, newDay: string, gapDays = 7): boolean {
  return previousWorkoutDay != null && daysBetween(previousWorkoutDay, newDay) >= gapDays;
}
