// Read helpers over the list of logs (Workout Logging, C4: ILogReader).

/** Ids of the most recently logged exercises, newest first. */
export function recentExerciseIds(logs, n = 6) {
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
  const ids = [];
  for (const l of sorted) {
    if (!ids.includes(l.exerciseId)) ids.push(l.exerciseId);
    if (ids.length >= n) break;
  }
  return ids;
}

/** exerciseId -> logs of that exercise. */
export function groupLogs(logs) {
  const m = {};
  for (const l of logs) (m[l.exerciseId] ??= []).push(l);
  return m;
}

/** Sets logged on a date for the sets-done counter (a log can hold several sets via its `sets` field). */
export const setsOn = (logs, date) => logs.filter((l) => l.date === date).reduce((a, l) => a + (l.sets || 1), 0);
