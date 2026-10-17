import { describe, expect, it } from 'vitest';
import data from '../src/data/exercises.json';
import { TEMPLATES, templateNames } from '../src/data/planTemplates';
import { DAYS, DAY_KEYS, addItem, emptyDay, migrateSchedule, moveItem, normalizeDay, planFromDocs, planGoal, removeItem, setTargets, toggleFocus } from '../src/lib/plan';
import { FOLDER_BY_KEY } from '../src/data/muscleFolders';

describe('plan days', () => {
  it('lists the week Saturday to Friday', () => {
    expect(DAY_KEYS).toEqual(['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']);
    expect(DAYS.map((d) => d.getDay)).toEqual([6, 0, 1, 2, 3, 4, 5]);
  });
  it('fills in missing fields', () => {
    expect(normalizeDay(undefined)).toEqual(emptyDay());
    expect(normalizeDay({ rest: true, items: [{ exerciseId: 'a' }, null, {}] }).items).toHaveLength(1);
    const plan = planFromDocs([{ id: 'mon', label: 'Chest', items: [{ exerciseId: 'a' }] }]);
    expect(Object.keys(plan)).toEqual(DAY_KEYS);
    expect(plan.mon.label).toBe('Chest');
    expect(plan.sat.items).toEqual([]);
  });
  it('weekly goal counts training days that have exercises', () => {
    const plan = planFromDocs([
      { id: 'sat', items: [{ exerciseId: 'a' }] }, { id: 'sun', rest: true, items: [{ exerciseId: 'a' }] }, { id: 'mon', label: 'empty' },
      { id: 'tue', items: [{ exerciseId: 'b' }] },
    ]);
    expect(planGoal(plan)).toBe(2);
  });
});

describe('editing a day', () => {
  const base = { ...emptyDay(), items: [] };
  it('adds with default targets and refuses duplicates', () => {
    const a = addItem(base, 'x');
    expect(a.items).toEqual([{ exerciseId: 'x', targetSets: 3, targetReps: 10, note: '' }]);
    expect(addItem(a, 'x')).toBe(a);
    expect(addItem(a, 'y', 4, 8).items[1]).toMatchObject({ targetSets: 4, targetReps: 8 });
  });
  it('removes, reorders and clamps targets', () => {
    let d = addItem(addItem(addItem(base, 'a'), 'b'), 'c');
    expect(moveItem(d, 2, 0).items.map((i) => i.exerciseId)).toEqual(['c', 'a', 'b']);
    expect(moveItem(d, 0, -1)).toBe(d);
    expect(moveItem(d, 2, 3)).toBe(d);
    expect(removeItem(d, 'b').items.map((i) => i.exerciseId)).toEqual(['a', 'c']);
    d = setTargets(d, 'a', 0, 500);
    expect(d.items[0]).toMatchObject({ targetSets: 1, targetReps: 100 });
  });
  it('toggles focus folders', () => {
    const d = toggleFocus(toggleFocus(base, 'chest'), 'triceps');
    expect(d.focus).toEqual(['chest', 'triceps']);
    expect(toggleFocus(d, 'chest').focus).toEqual(['triceps']);
  });
});

describe('migrating the old schedule', () => {
  const sched = [
    { weekday: 6, name: 'Saturday', exerciseIds: ['e1', 'e2', 'gone'] },
    { weekday: 1, name: 'Push day', exerciseIds: ['e3'] },
    { weekday: 1, name: 'Abs', exerciseIds: ['e3', 'e4'] },
    { weekday: null, name: 'Custom', exerciseIds: ['e1'] },
  ];
  const { plan, unplaced } = migrateSchedule(sched, new Set(['e1', 'e2', 'e3', 'e4']));
  it('places days by weekday and drops exercises that no longer exist', () => {
    expect(plan.sat.items.map((i) => i.exerciseId)).toEqual(['e1', 'e2']);
    expect(plan.sat.label).toBe(''); // the default weekday name is not a label
    expect(plan.sat.rest).toBe(false);
  });
  it('merges two schedule days on the same weekday without duplicates', () => {
    expect(plan.mon.label).toBe('Push day + Abs');
    expect(plan.mon.items.map((i) => i.exerciseId)).toEqual(['e3', 'e4']);
  });
  it('makes unscheduled days rest days and counts days it could not place', () => {
    expect(plan.tue.rest).toBe(true);
    expect(plan.fri.rest).toBe(true);
    expect(unplaced).toBe(1);
    expect(planGoal(plan)).toBe(2);
  });
});

describe('starter templates', () => {
  const names = new Set(data.map((x) => x.name));
  it('only use exercises that exist in the dataset', () => {
    for (const t of TEMPLATES) for (const n of templateNames(t)) expect(names.has(n), `${t.key}: ${n}`).toBe(true);
  });
  it('cover seven days with valid focus folders and sensible targets', () => {
    for (const t of TEMPLATES) {
      expect(t.week).toHaveLength(7);
      const training = t.week.filter(Boolean);
      expect(training.length).toBeGreaterThanOrEqual(3);
      for (const d of training) {
        expect(d.picks.length).toBeGreaterThanOrEqual(4);
        d.focus.forEach((f) => expect(FOLDER_BY_KEY[f], f).toBeTruthy());
        const dup = d.picks.map((p) => p[0]);
        expect(new Set(dup).size).toBe(dup.length);
        d.picks.forEach(([, s, r]) => { expect(s).toBeGreaterThanOrEqual(1); expect(r).toBeGreaterThanOrEqual(1); });
      }
    }
  });
});

import { clearDay, copyDay, dayChanged, moveDay, shiftWeek, swapDays } from '../src/lib/plan';

describe('week editing', () => {
  const mk = () => {
    const p = Object.fromEntries(DAY_KEYS.map((k) => [k, emptyDay()]));
    p.sat = { label: 'Chest', rest: false, focus: ['chest'], items: [{ exerciseId: 'a', targetSets: 3, targetReps: 10, note: '' }] };
    p.sun = { label: 'Back', rest: false, focus: [], items: [{ exerciseId: 'b', targetSets: 4, targetReps: 8, note: '' }] };
    p.fri = { ...emptyDay(), rest: true };
    return p;
  };
  it('shifts the whole week forward and wraps around', () => {
    const s = shiftWeek(mk(), 1);
    expect(s.sun.label).toBe('Chest');
    expect(s.mon.label).toBe('Back');
    expect(s.sat.rest).toBe(true); // Friday wraps to Saturday
    expect(Object.values(s).flatMap((d) => d.items)).toHaveLength(2);
  });
  it('shifts back and by 7 is a no-op', () => {
    const s = shiftWeek(mk(), -1);
    expect(s.fri.label).toBe('Chest');
    expect(s.sat.label).toBe('Back');
    const full = shiftWeek(mk(), 7);
    DAY_KEYS.forEach((k) => expect(dayChanged(full[k], mk()[k])).toBe(false));
  });
  it('does not change its input', () => {
    const p = mk();
    const before = JSON.stringify(p);
    shiftWeek(p, 3); swapDays(p, 'sat', 'sun'); moveDay(p, 'sat', 'mon'); copyDay(p, 'sat', 'mon');
    expect(JSON.stringify(p)).toBe(before);
  });
  it('swaps, moves and copies whole days', () => {
    const sw = swapDays(mk(), 'sat', 'sun');
    expect(sw.sat.label).toBe('Back');
    expect(sw.sun.label).toBe('Chest');
    const mv = moveDay(mk(), 'sat', 'mon');
    expect(mv.mon.label).toBe('Chest');
    expect(mv.sat).toEqual(emptyDay());
    const cp = copyDay(mk(), 'sat', 'mon');
    expect(cp.mon.items).toEqual(mk().sat.items);
    expect(cp.sat.label).toBe('Chest');
    cp.mon.items[0].targetSets = 9;
    expect(cp.sat.items[0].targetSets).toBe(3); // copies are independent
  });
  it('clear day removes exercises only', () => {
    const c = clearDay(mk().sat);
    expect(c.items).toEqual([]);
    expect(c.label).toBe('Chest');
    expect(c.focus).toEqual(['chest']);
  });
});
