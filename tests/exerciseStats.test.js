import { describe, expect, it } from 'vitest';
import data from '../src/library/data/exercises.json';
import { exerciseSummary } from '../src/library/exerciseSummary';
import { bestWeight, lastLog, lastSets, sessionsOf, setsOn, trendOf } from '../src/progress/exerciseStats';

const log = (date, weight, reps = 8, sets = 1, secs = 0) => ({ id: `${date}-${weight}-${secs}`, date, weight, reps, sets, createdAt: { seconds: secs } });

describe('summary sentence', () => {
  it('describes a compound pull with secondary help', () => {
    const s = exerciseSummary({ mechanic: 'compound', force: 'pull', primaryMuscles: ['lats'], secondaryMuscles: ['middle back', 'biceps'] });
    expect(s).toBe('A compound pull that mainly works your lats, with help from middle back and biceps.');
  });
  it('uses "An" for isolation, handles static and missing fields', () => {
    expect(exerciseSummary({ mechanic: 'isolation', force: 'push', primaryMuscles: ['triceps'], secondaryMuscles: [] })).toBe('An isolation push that mainly works your triceps.');
    expect(exerciseSummary({ mechanic: null, force: 'static', primaryMuscles: ['abdominals'], secondaryMuscles: ['lower back'] })).toBe('A static hold that mainly works your abdominals, with help from lower back.');
    expect(exerciseSummary({ mechanic: null, force: null, primaryMuscles: ['calves'], secondaryMuscles: [] })).toBe('An exercise that mainly works your calves.');
    expect(exerciseSummary({ primaryMuscles: [] })).toBeNull();
  });
  it('produces a sentence for every exercise in the dataset', () => {
    for (const ex of data) expect(exerciseSummary(ex), ex.name).toMatch(/^An? .+ that mainly works your .+\.$/);
  });
});

describe('progress stats', () => {
  const logs = [log('2026-10-01', 60), log('2026-10-01', 70, 5, 1, 1), log('2026-10-03', 72.5), log('2026-10-05', 75), log('2026-10-08', 80)];
  it('groups by day with the heaviest weight', () => {
    expect(sessionsOf(logs).map((s) => [s.date, s.top, s.sets])).toEqual([['2026-10-01', 70, 2], ['2026-10-03', 72.5, 1], ['2026-10-05', 75, 1], ['2026-10-08', 80, 1]]);
    expect(bestWeight(logs)).toBe(80);
    expect(lastLog(logs).weight).toBe(80);
    expect(lastSets(logs, 2).map((l) => l.weight)).toEqual([80, 75]);
  });
  it('trend needs two sessions and ignores tiny changes', () => {
    expect(trendOf([log('2026-10-01', 60)])).toBeNull();
    expect(trendOf(logs)).toBe('up');
    expect(trendOf([log('2026-10-01', 80), log('2026-10-03', 80), log('2026-10-05', 80.5)])).toBe('flat');
    expect(trendOf([log('2026-10-01', 80), log('2026-10-03', 80), log('2026-10-05', 70)])).toBe('down');
    expect(trendOf([])).toBeNull();
  });
  it('counts sets logged on a day, using the sets field', () => {
    expect(setsOn([log('2026-10-08', 80, 8, 3), log('2026-10-08', 82, 6, 1), log('2026-10-07', 80)], '2026-10-08')).toBe(4);
    expect(setsOn([], '2026-10-08')).toBe(0);
  });
});
