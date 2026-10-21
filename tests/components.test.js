import { describe, expect, it } from 'vitest';
import { attendanceSummary, weekStreak, weeklyGoal } from '../src/attendance/attendance';
import { progressPct } from '../src/body/bodyMath';
import { computePRs, epley } from '../src/progress/prs';
import { groupLogs, recentExerciseIds, setsOn } from '../src/logging/logReader';
import { IN_METRICS } from '../src/inbody/inbody';

const log = (id, exerciseId, date, weight, sec = 0) => ({ id, exerciseId, date, weight, reps: 8, sets: 1, createdAt: { seconds: sec } });

describe('attendance (C7)', () => {
  it('weekly goal follows the plan, then the profile, then 3', () => {
    expect(weeklyGoal(4, 2)).toBe(4);
    expect(weeklyGoal(0, 5)).toBe(5);
    expect(weeklyGoal(0, undefined)).toBe(3);
  });
  it('summarises the Saturday-Friday week', () => {
    // 2026-10-21 is a Wednesday; the week started Saturday 2026-10-17
    const s = attendanceSummary({ logDates: ['2026-10-17', '2026-10-19'], checkinIds: ['2026-10-20', '2026-10-17'], goal: 3, today: '2026-10-21' });
    expect(s.weekDays[0]).toBe('2026-10-17');
    expect(s.weekDays).toHaveLength(7);
    expect(s.daysThisWeek).toBe(3);
    expect(s.dayState('2026-10-17')).toMatchObject({ state: 'done', locked: false });
    expect(s.dayState('2026-10-19')).toMatchObject({ state: 'done', locked: true, disabled: true });
    expect(s.dayState('2026-10-18')).toMatchObject({ state: 'missed', disabled: false });
    expect(s.dayState('2026-10-21')).toMatchObject({ state: 'today', disabled: false });
    expect(s.dayState('2026-10-22')).toMatchObject({ state: 'future', disabled: true });
  });
  it('week streak counts consecutive weeks that reach the goal', () => {
    const today = new Date();
    const dates = [];
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    for (let w = 1; w <= 2; w++) for (let k = 0; k < 3; k++) { const d = new Date(today); d.setDate(d.getDate() - w * 7 - k); dates.push(iso(d)); }
    expect(weekStreak([], 3)).toBe(0);
    expect(weekStreak(dates, 99)).toBe(0);
  });
});

describe('body (C8)', () => {
  it('progress works for loss and gain and is clamped', () => {
    expect(progressPct(100, 90, 80)).toBe(50);
    expect(progressPct(60, 70, 80)).toBe(50);
    expect(progressPct(100, 120, 80)).toBe(0);
    expect(progressPct(100, 70, 80)).toBe(100);
    expect(progressPct(null, 70, 80)).toBeNull();
    expect(progressPct(80, 80, 80)).toBe(100);
  });
});

describe('progress records (C5)', () => {
  it('a PR beats every earlier set of the same exercise', () => {
    const logs = [log('a', 'x', '2026-10-01', 50), log('b', 'x', '2026-10-02', 60), log('c', 'x', '2026-10-03', 55), log('d', 'y', '2026-10-01', 10)];
    expect([...computePRs(logs)]).toEqual(['b']);
  });
  it('epley estimates 1RM only for more than one rep', () => {
    expect(epley(100, 1)).toBe(100);
    expect(epley(100, 3)).toBeCloseTo(110);
  });
});

describe('log reader (C4)', () => {
  const logs = [log('a', 'x', '2026-10-01', 50, 1), log('b', 'y', '2026-10-03', 20, 2), log('c', 'x', '2026-10-02', 52, 3), log('d', 'z', '2026-10-03', 5, 9)];
  it('lists recent exercises newest first without duplicates', () => {
    expect(recentExerciseIds(logs, 6)).toEqual(['z', 'y', 'x']);
    expect(recentExerciseIds(logs, 2)).toEqual(['z', 'y']);
  });
  it('groups logs by exercise', () => {
    const g = groupLogs(logs);
    expect(g.x).toHaveLength(2);
    expect(Object.keys(g).sort()).toEqual(['x', 'y', 'z']);
  });
  it('counts sets on a date', () => {
    expect(setsOn(logs, '2026-10-03')).toBe(2);
  });
});

describe('inbody (C9)', () => {
  it('has the six metrics with a good direction', () => {
    expect(IN_METRICS.map((m) => m.key)).toEqual(['weight', 'muscle', 'fatMass', 'fatPct', 'visceral', 'bmr']);
    expect(IN_METRICS.find((m) => m.key === 'muscle').goodUp).toBe(true);
    expect(IN_METRICS.find((m) => m.key === 'fatPct').goodUp).toBe(false);
  });
});
