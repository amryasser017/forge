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
