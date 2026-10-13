// Weekly plan: users/{uid}/plan/{sat|sun|mon|tue|wed|thu|fri}
// { label: string, rest: boolean, focus: [muscleFolderKeys], items: [{ exerciseId, targetSets, targetReps, note }] }
// The week is displayed Saturday -> Friday (see WEEK_ORDER in utils.js).
import { WEEK_ORDER } from '../utils';

const BY_GETDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const NAMES = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };

/** The 7 days in display order, each with its JS getDay() number. */
export const DAYS = WEEK_ORDER.map((n) => ({ key: BY_GETDAY[n], getDay: n, name: NAMES[BY_GETDAY[n]], short: NAMES[BY_GETDAY[n]].slice(0, 3) }));
export const DAY_KEYS = DAYS.map((d) => d.key);
export const dayKeyOf = (date = new Date()) => BY_GETDAY[date.getDay()];
export const dayInfo = (key) => DAYS.find((d) => d.key === key);

export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;
export const emptyDay = () => ({ label: '', rest: false, focus: [], items: [] });

/** Fill in missing fields of a stored day doc (or a missing doc). */
export function normalizeDay(doc) {
  const d = doc || {};
  return {
    label: typeof d.label === 'string' ? d.label : '',
    rest: !!d.rest,
    focus: Array.isArray(d.focus) ? d.focus : [],
    items: Array.isArray(d.items) ? d.items.filter((i) => i && i.exerciseId) : [],
  };
}

/** { sat: day, sun: day, ... } from the plan collection's docs. */
export function planFromDocs(docs) {
  const by = Object.fromEntries(docs.map((d) => [d.id, d]));
  return Object.fromEntries(DAY_KEYS.map((k) => [k, normalizeDay(by[k])]));
}

/** Weekly gym-day goal = training days that have at least one exercise. */
export const planGoal = (plan) => DAY_KEYS.filter((k) => !plan[k].rest && plan[k].items.length > 0).length;
export const planHasItems = (plan) => DAY_KEYS.some((k) => plan[k].items.length > 0);

export const hasItem = (day, exerciseId) => day.items.some((i) => i.exerciseId === exerciseId);

/** Append an exercise; refuses duplicates within the same day. */
export function addItem(day, exerciseId, targetSets = DEFAULT_SETS, targetReps = DEFAULT_REPS) {
  if (hasItem(day, exerciseId)) return day;
  return { ...day, items: [...day.items, { exerciseId, targetSets, targetReps, note: '' }] };
}
export const removeItem = (day, exerciseId) => ({ ...day, items: day.items.filter((i) => i.exerciseId !== exerciseId) });
export function moveItem(day, from, to) {
  if (to < 0 || to >= day.items.length || from === to) return day;
  const items = [...day.items];
  const [it] = items.splice(from, 1);
  items.splice(to, 0, it);
  return { ...day, items };
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n)));
export function setTargets(day, exerciseId, sets, reps) {
  return { ...day, items: day.items.map((i) => (i.exerciseId === exerciseId ? { ...i, targetSets: clamp(sets, 1, 20), targetReps: clamp(reps, 1, 100) } : i)) };
}
export const toggleFocus = (day, key) => ({ ...day, focus: day.focus.includes(key) ? day.focus.filter((k) => k !== key) : [...day.focus, key] });

/**
 * One-time conversion of the old "schedule" (named days with a weekday) into the weekly plan.
 * Days without a weekday cannot be placed and are only counted. Days that were not scheduled become rest days.
 * `existingIds` = ids of exercise docs that still exist.
 */
export function migrateSchedule(scheduleDocs, existingIds) {
  const plan = Object.fromEntries(DAY_KEYS.map((k) => [k, { ...emptyDay(), rest: true }]));
  let unplaced = 0;
  for (const s of scheduleDocs) {
    if (s.weekday == null || s.weekday < 0 || s.weekday > 6) { unplaced += 1; continue; }
    const key = BY_GETDAY[s.weekday];
    const day = plan[key];
    day.rest = false;
    const name = (s.name || '').trim();
    if (name && name !== NAMES[key]) day.label = day.label ? `${day.label} + ${name}` : name;
    for (const id of s.exerciseIds || []) {
      if (existingIds.has(id) && !hasItem(day, id)) day.items.push({ exerciseId: id, targetSets: DEFAULT_SETS, targetReps: DEFAULT_REPS, note: '' });
    }
  }
  return { plan, unplaced };
}
