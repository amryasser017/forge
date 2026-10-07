export const KG_PER_LB = 0.45359237;
export const WEEK_GOAL = 3; // gym days per week that count toward the streak

export const r1 = (n) => Math.round(n * 10) / 10;

export const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayStr = () => ymd(new Date());

export const fmtDate = (s, opts) =>
  s
    ? new Date(s + 'T00:00:00').toLocaleDateString(
        'en-GB',
        opts || { day: 'numeric', month: 'short', year: 'numeric' }
      )
    : '';
export const shortDate = (s) => fmtDate(s, { day: 'numeric', month: 'short' });

/** Works for weight loss (start > target) and weight gain (start < target). */
export function progressPct(start, current, target) {
  if ([start, current, target].some((v) => v == null || Number.isNaN(v))) return null;
  if (start === target) return 100;
  const p = ((start - current) / (start - target)) * 100;
  return Math.max(0, Math.min(100, p));
}

/** Epley estimated one-rep max. */
export const epley = (w, reps) => (reps > 1 ? w * (1 + reps / 30) : w);

const stamp = (x) => x.createdAt?.seconds ?? 9e12;
export const byDate = (a, b) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : stamp(a) - stamp(b);

/** Returns a Set of log ids that beat the previous best weight for that exercise. */
export function computePRs(logs) {
  const best = {};
  const prs = new Set();
  [...logs].sort(byDate).forEach((l) => {
    const b = best[l.exerciseId];
    if (b === undefined) best[l.exerciseId] = l.weight;
    else if (l.weight > b) {
      prs.add(l.id);
      best[l.exerciseId] = l.weight;
    }
  });
  return prs;
}

export function weekStart(s) {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymd(d);
}

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

export function compressImage(file, max = 1200, quality = 0.74) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export const IN_METRICS = [
  { key: 'weight', label: 'Weight', kind: 'mass', goodUp: null },
  { key: 'muscle', label: 'Skeletal muscle mass', kind: 'mass', goodUp: true },
  { key: 'fatMass', label: 'Body fat mass', kind: 'mass', goodUp: false },
  { key: 'fatPct', label: 'Body fat %', kind: '%', goodUp: false },
  { key: 'visceral', label: 'Visceral fat level', kind: '', goodUp: false },
  { key: 'bmr', label: 'BMR (kcal)', kind: 'kcal', goodUp: true },
];

export const COLORS = {
  ember: '#FF6A2B',
  volt: '#43D9F0',
  gold: '#FFC53D',
  good: '#5BE08A',
  bad: '#FF5C5C',
};
