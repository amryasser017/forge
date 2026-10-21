// Dates and the Saturday-first week (Shared Kernel, C10). Dates are YYYY-MM-DD strings.
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; // index = JS getDay()
/** getDay() values in display order; the week starts on Saturday. */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

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

const stamp = (x) => x.createdAt?.seconds ?? 9e12;
export const byDate = (a, b) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : stamp(a) - stamp(b);

export function weekStart(s) {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7)); // weeks start on Saturday
  return ymd(d);
}
