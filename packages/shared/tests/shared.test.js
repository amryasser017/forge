import { describe, expect, it } from 'vitest';
import { makeUnits, KG_PER_LB, DAY_NAMES, WEEK_ORDER, byDate, fmtDate, shortDate, weekStart, ymd } from '@forge/shared';

describe('units (C10)', () => {
  it('kg shows and parses as is', () => {
    const u = makeUnits('kg');
    expect(u.show(82.46)).toBe(82.5);
    expect(u.toKg('82.5')).toBe(82.5);
    expect(u.toKg('abc')).toBeNull();
    expect(u.show(null)).toBe('');
  });
  it('lb converts both ways and stores kg with 2 decimals', () => {
    const u = makeUnits('lb');
    expect(u.show(100)).toBe(220.5);
    expect(u.toKg('220.5')).toBe(100.02);
    expect(u.toKg(1)).toBe(Math.round(KG_PER_LB * 100) / 100);
  });
});

describe('dates (C10)', () => {
  it('formats YYYY-MM-DD', () => {
    expect(ymd(new Date(2026, 9, 3))).toBe('2026-10-03');
    expect(fmtDate('')).toBe('');
    expect(shortDate('2026-10-03')).toMatch(/3 Oct/);
  });
  it('weeks start on Saturday', () => {
    expect(weekStart('2026-10-17')).toBe('2026-10-17'); // Saturday
    expect(weekStart('2026-10-18')).toBe('2026-10-17'); // Sunday
    expect(weekStart('2026-10-23')).toBe('2026-10-17'); // Friday
    expect(weekStart('2026-10-24')).toBe('2026-10-24'); // next Saturday
    expect(WEEK_ORDER.map((n) => DAY_NAMES[n])[0]).toBe('Saturday');
  });
  it('byDate orders by date and then by creation time', () => {
    const a = { date: '2026-10-01', createdAt: { seconds: 5 } };
    const b = { date: '2026-10-01', createdAt: { seconds: 9 } };
    const c = { date: '2026-09-30', createdAt: { seconds: 99 } };
    expect([b, a, c].sort(byDate)).toEqual([c, a, b]);
  });
});
