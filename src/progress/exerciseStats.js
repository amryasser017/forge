// Progress numbers for one exercise, computed from its logs (weights are stored in kg).
const stamp = (l) => l.createdAt?.seconds ?? 0;
export const byDateAsc = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : stamp(a) - stamp(b));

/** One entry per training day, oldest first: { date, top, sets } where top is the heaviest weight that day. */
export function sessionsOf(logs) {
  const by = new Map();
  for (const l of [...logs].sort(byDateAsc)) {
    const s = by.get(l.date) ?? { date: l.date, top: 0, sets: 0 };
    s.top = Math.max(s.top, l.weight);
    s.sets += l.sets || 1;
    by.set(l.date, s);
  }
  return [...by.values()];
}

export const bestWeight = (logs) => logs.reduce((m, l) => Math.max(m, l.weight), 0);
export const lastLog = (logs) => [...logs].sort(byDateAsc).pop() ?? null;
/** Newest first. */
export const lastSets = (logs, k = 5) => [...logs].sort(byDateAsc).reverse().slice(0, k);

/**
 * 'up' | 'down' | 'flat' from the top weight of the latest session versus the average of the previous
 * (up to 3) sessions. null when there are fewer than two sessions. A change under 2% counts as flat.
 */
export function trendOf(logs) {
  const s = sessionsOf(logs).slice(-4);
  if (s.length < 2) return null;
  const latest = s[s.length - 1].top;
  const prev = s.slice(0, -1);
  const avg = prev.reduce((a, x) => a + x.top, 0) / prev.length;
  if (avg <= 0) return null;
  const change = (latest - avg) / avg;
  return change > 0.02 ? 'up' : change < -0.02 ? 'down' : 'flat';
}

/** Sets logged today for the sets-done counter (a log can hold several sets via its `sets` field). */
export const setsOn = (logs, date) => logs.filter((l) => l.date === date).reduce((a, l) => a + (l.sets || 1), 0);
