/** Day keys are 'YYYY-MM-DD' strings in the app timezone. All "day boundary" logic goes through here. */
export const DEFAULT_TZ = 'Africa/Cairo';
/** 0 = Sunday. Weeks start on Sunday (same as the original Forge app). */
export const WEEK_STARTS_ON = 0;

export function dayKey(date: Date | string | number = new Date(), tz: string = DEFAULT_TZ): string {
  const d = date instanceof Date ? date : new Date(date);
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function toUtc(key: string): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}
function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(key: string, n: number): string {
  const d = toUtc(key);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}
export function dayOfWeek(key: string): number {
  return toUtc(key).getUTCDay();
}
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}
export function rangeKeys(start: string, end: string): string[] {
  const out: string[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
}
export function weekStartKey(key: string, weekStartsOn = WEEK_STARTS_ON): string {
  const diff = (dayOfWeek(key) - weekStartsOn + 7) % 7;
  return addDays(key, -diff);
}
export function weekRange(key: string, weekStartsOn = WEEK_STARTS_ON): { start: string; end: string } {
  const start = weekStartKey(key, weekStartsOn);
  return { start, end: addDays(start, 6) };
}
export function monthStartKey(key: string): string {
  return `${key.slice(0, 7)}-01`;
}
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function fmtDay(key: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(toUtc(key));
}
