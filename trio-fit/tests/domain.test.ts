import { describe, expect, it } from 'vitest';
import { bmi, fatFreeMassKg, fatMassKg, pctChange, targetProgress, delta } from '@/lib/domain/body';
import { compareExercise, detectPrs, totalVolume, totalReps, maxWeight, improvementScore, compareCardio } from '@/lib/domain/workout';
import { DEFAULT_XP_RULES, levelFromXp, resolveRules, xpToReachLevel, costOfLevel, coinsForXp } from '@/lib/domain/xp';
import { workoutStreak, loggingStreak, consistency, weekProgress, isComeback } from '@/lib/domain/streaks';
import { addDays, dayKey, dayOfWeek, weekStartKey, weekRange, rangeKeys, WEEK_ORDER } from '@/lib/domain/time';
import { parseYouTubeUrl, searchUrl, embedUrl } from '@/lib/domain/youtube';
import { validateChallengeDraft, progressPct, isComplete, battleWinner, type ChallengeDraft } from '@/lib/domain/challenges';
import { rank } from '@/lib/domain/leaderboard';
import { sumMacros, macrosForGrams, percentOfTarget } from '@/lib/domain/nutrition';
import { isFaithfulRewrite, ruleMessage } from '@/lib/domain/messages';

describe('body calculations', () => {
  it('computes BMI = kg / m²', () => {
    expect(bmi(80, 180)).toBe(24.7);
    expect(bmi(null, 180)).toBeNull();
    expect(bmi(80, 0)).toBeNull();
  });
  it('computes fat mass and fat-free mass', () => {
    expect(fatMassKg(80, 25)).toBe(20);
    expect(fatFreeMassKg(80, 25)).toBe(60);
    expect(fatMassKg(80, null)).toBeNull();
    expect(fatMassKg(80, 120)).toBeNull();
  });
  it('handles zero / missing baselines in % change', () => {
    expect(pctChange(100, 110)).toBe(10);
    expect(pctChange(0, 5)).toBeNull();
    expect(pctChange(null, 5)).toBeNull();
    expect(delta(10, 12.5)).toBe(2.5);
  });
  it('target progress works for loss and gain and clamps', () => {
    expect(targetProgress(100, 90, 80)).toBe(50);
    expect(targetProgress(60, 65, 70)).toBe(50);
    expect(targetProgress(100, 110, 80)).toBe(0);
    expect(targetProgress(100, 70, 80)).toBe(100);
    expect(targetProgress(null, 70, 80)).toBeNull();
  });
});

describe('workout volume, comparison and PRs', () => {
  const prev = [{ weightKg: 80, reps: 12 }, { weightKg: 90, reps: 10 }, { weightKg: 100, reps: 8 }];
  const cur = [{ weightKg: 80, reps: 12 }, { weightKg: 90, reps: 10 }, { weightKg: 105, reps: 8 }];
  it('sums weight × reps, ignoring incomplete sets', () => {
    expect(totalVolume(prev)).toBe(80 * 12 + 90 * 10 + 100 * 8);
    expect(totalVolume([{ weightKg: 50, reps: null }, { weightKg: null, reps: 10 }])).toBe(0);
    expect(totalReps(prev)).toBe(30);
    expect(maxWeight(prev)).toBe(100);
  });
  it('compares to the previous session with absolute and % change', () => {
    const c = compareExercise(cur, prev);
    expect(c.comparable).toBe(true);
    expect(c.weight?.delta).toBe(5);
    expect(c.weight?.improved).toBe(true);
    expect(c.reps?.improved).toBe(false);
    expect(c.volume?.delta).toBe(40);
    expect(c.setBySet).toHaveLength(3);
  });
  it('does not claim improvement without comparable data', () => {
    expect(compareExercise(cur, null).comparable).toBe(false);
    expect(compareExercise(cur, [{ weightKg: null, reps: null }]).comparable).toBe(false);
  });
  it('first session is a baseline, not a PR', () => {
    const r = detectPrs(cur, []);
    expect(r.baseline).toBe(true);
    expect(r.weightPr).toBe(false);
  });
  it('detects weight and volume PRs only when strictly better', () => {
    expect(detectPrs(cur, [prev]).weightPr).toBe(true);
    expect(detectPrs(prev, [prev]).weightPr).toBe(false);
    expect(detectPrs(prev, [cur]).weightPr).toBe(false);
    expect(detectPrs(cur, [prev]).volumePr).toBe(true);
  });
  it('compares cardio by duration and distance', () => {
    const c = compareCardio({ durationMin: 30, distanceKm: 4 }, { durationMin: 25, distanceKm: 3.5 });
    expect(c.comparable && c.duration?.improved).toBe(true);
    expect(compareCardio({ durationMin: 30, distanceKm: 4 }, null).comparable).toBe(false);
  });
  it('improvement score compares a member only with themselves', () => {
    expect(improvementScore([{ volumes: [100, 110] }, { volumes: [200, 200] }])).toBe(5);
    expect(improvementScore([{ volumes: [100] }])).toBeNull();
  });
});

describe('XP and levels', () => {
  it('level curve gets progressively harder', () => {
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(2)).toBe(100);
    expect(xpToReachLevel(3)).toBe(250);
    expect(costOfLevel(4)).toBeGreaterThan(costOfLevel(3));
    expect(xpToReachLevel(10)).toBe(100 * 9 + 25 * 9 * 8);
  });
  it('derives level, progress and next-level XP', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    const l = levelFromXp(175);
    expect(l.level).toBe(2);
    expect(l.xpIntoLevel).toBe(75);
    expect(l.xpForNext).toBe(150);
    expect(l.progress).toBe(0.5);
    expect(levelFromXp(-5).level).toBe(1);
  });
  it('ignores invalid rule overrides', () => {
    expect(resolveRules({ workout: 120, waterTarget: -1, personalRecord: 'x' }).workout).toBe(120);
    expect(resolveRules({ waterTarget: -1 }).waterTarget).toBe(DEFAULT_XP_RULES.waterTarget);
    expect(resolveRules(null)).toEqual(DEFAULT_XP_RULES);
    expect(coinsForXp(100, DEFAULT_XP_RULES)).toBe(10);
  });
});

describe('time and day boundaries', () => {
  it('uses the app timezone for day keys', () => {
    // 23:30 UTC on Jan 1 is already Jan 2 in Cairo (UTC+2)
    expect(dayKey(new Date('2026-01-01T23:30:00Z'), 'Africa/Cairo')).toBe('2026-01-02');
    expect(dayKey(new Date('2026-01-01T23:30:00Z'), 'UTC')).toBe('2026-01-01');
  });
  it('does date math on keys and weeks start on Saturday', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(dayOfWeek('2026-10-07')).toBe(3); // Wednesday
    expect(weekStartKey('2026-10-07')).toBe('2026-10-03'); // Saturday
    expect(weekStartKey('2026-10-03')).toBe('2026-10-03'); // a Saturday starts its own week
    expect(weekStartKey('2026-10-09')).toBe('2026-10-03'); // Friday is the last day of that week
    expect(weekStartKey('2026-10-10')).toBe('2026-10-10');
    expect(weekRange('2026-10-07').end).toBe('2026-10-09');
    expect(WEEK_ORDER).toEqual([6, 0, 1, 2, 3, 4, 5]);
    expect(rangeKeys('2026-01-01', '2026-01-03')).toHaveLength(3);
  });
});

describe('streaks', () => {
  const all = [0, 1, 2, 3, 4, 5, 6];
  it('counts consecutive completed days', () => {
    const done = ['2026-10-05', '2026-10-06', '2026-10-07'];
    expect(workoutStreak(done, all, '2026-10-07').current).toBe(3);
  });
  it('a pending today does not break the streak', () => {
    expect(workoutStreak(['2026-10-05', '2026-10-06'], all, '2026-10-07').current).toBe(2);
  });
  it('a missed planned day breaks it', () => {
    expect(workoutStreak(['2026-10-04', '2026-10-06', '2026-10-07'], all, '2026-10-07')).toEqual({ current: 2, longest: 2 });
  });
  it('rest days do not break the streak', () => {
    // plan Sat(6), Mon(1), Wed(3); 2026-10-05 is Monday, 10-06 Tuesday (rest), 10-07 Wednesday
    expect(workoutStreak(['2026-10-05', '2026-10-07'], [6, 1, 3], '2026-10-07').current).toBe(2);
  });
  it('tracks the longest streak separately', () => {
    const done = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-10-07'];
    const r = workoutStreak(done, all, '2026-10-07');
    expect(r.longest).toBe(4);
    expect(r.current).toBe(1);
  });
  it('logging streak treats today as pending', () => {
    expect(loggingStreak(['2026-10-05', '2026-10-06'], '2026-10-07')).toBe(2);
    expect(loggingStreak(['2026-10-07', '2026-10-06'], '2026-10-07')).toBe(2);
    expect(loggingStreak(['2026-10-01'], '2026-10-07')).toBe(0);
  });
  it('consistency counts only planned days and ignores the future', () => {
    // Sun Oct 4 .. Wed Oct 7 planned, 2 done
    expect(consistency(['2026-10-04', '2026-10-06'], all, '2026-10-04', '2026-10-10', '2026-10-07')).toBe(50);
    expect(consistency([], [], '2026-10-04', '2026-10-10', '2026-10-07')).toBeNull();
  });
  it('week progress separates planned and extra sessions', () => {
    const w = weekProgress(['2026-10-04', '2026-10-05'], [0, 3], '2026-10-04');
    expect(w).toEqual({ planned: 2, completed: 1, extra: 1 });
  });
  it('detects a comeback after a long gap only', () => {
    expect(isComeback('2026-09-20', '2026-10-01')).toBe(true);
    expect(isComeback('2026-09-28', '2026-10-01')).toBe(false);
    expect(isComeback(null, '2026-10-01')).toBe(false);
  });
});

describe('youtube links', () => {
  it('parses supported shapes and rejects the rest', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeUrl('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseYouTubeUrl('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(parseYouTubeUrl('javascript:alert(1)')).toBeNull();
    expect(parseYouTubeUrl('not a url')).toBeNull();
  });
  it('builds embed and search fallbacks without inventing ids', () => {
    expect(embedUrl('dQw4w9WgXcQ')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(searchUrl('leg press form')).toBe('https://www.youtube.com/results?search_query=leg%20press%20form');
  });
});

describe('challenges', () => {
  const base: ChallengeDraft = { title: 't', description: '', scope: 'individual', metric: 'workout_sessions', target: 4, startsOn: '2026-10-04', endsOn: '2026-10-10', xpReward: 100 };
  it('accepts a safe challenge', () => expect(validateChallengeDraft(base)).toBeNull());
  it('rejects unsafe or unrealistic ones', () => {
    expect(validateChallengeDraft({ ...base, target: 40 })).toMatch(/capped/);
    expect(validateChallengeDraft({ ...base, endsOn: '2026-09-01' })).toMatch(/End date/);
    expect(validateChallengeDraft({ ...base, endsOn: '2026-12-31' })).toMatch(/31 days/);
    expect(validateChallengeDraft({ ...base, xpReward: 9999 })).toMatch(/XP/);
    expect(validateChallengeDraft({ ...base, metric: 'weight_loss' as never })).toMatch(/Unknown/);
    expect(validateChallengeDraft({ ...base, metric: 'water_days', target: 10 })).toMatch(/number of days/);
  });
  it('computes progress and winners', () => {
    expect(progressPct(3, 4)).toBe(75);
    expect(progressPct(9, 4)).toBe(100);
    expect(isComplete(4, 4)).toBe(true);
    expect(isComplete(3, 4)).toBe(false);
    expect(battleWinner({ memberId: 'a', progress: 3 }, { memberId: 'b', progress: 2 })).toBe('a');
    expect(battleWinner({ memberId: 'a', progress: 2 }, { memberId: 'b', progress: 2 })).toBeNull();
  });
});

describe('leaderboard ranking', () => {
  it('ranks with ties and leaves members without data unranked', () => {
    const r = rank([{ memberId: 'a', value: 10 }, { memberId: 'b', value: 10 }, { memberId: 'c', value: 5 }, { memberId: 'd', value: null }]);
    expect(r.map((x) => x.rank)).toEqual([1, 1, 3, null]);
    expect(r[3]?.memberId).toBe('d');
  });
});

describe('nutrition', () => {
  it('sums and scales macros', () => {
    expect(sumMacros([{ calories: 200, proteinG: 10 }, { calories: 150.4, proteinG: 5.5 }]).calories).toBe(350);
    const m = macrosForGrams({ calories: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3 }, 200);
    expect(m.calories).toBe(260);
    expect(m.proteinG).toBe(5.4);
    expect(percentOfTarget(1500, 2000)).toBe(75);
    expect(percentOfTarget(100, null)).toBeNull();
  });
});

describe('rule-based motivation', () => {
  it('only mentions numbers that are in the facts', () => {
    const withPct = ruleMessage('workout', { name: 'Shady', volumePct: 12.5 }, 'calm', 'en', 'x');
    expect(withPct).toContain('12.5%');
    const without = ruleMessage('workout', { name: 'Shady', volumePct: null }, 'calm', 'en', 'x');
    expect(without).not.toMatch(/\d+%/);
  });
  it('is deterministic per seed and supports Arabic', () => {
    expect(ruleMessage('pr', { name: 'Amr', exercise: 'Leg Press' }, 'hype', 'ar', 's')).toBe(ruleMessage('pr', { name: 'Amr', exercise: 'Leg Press' }, 'hype', 'ar', 's'));
    expect(ruleMessage('pr', { name: 'Amr', exercise: 'Leg Press' }, 'hype', 'ar', 's')).toContain('Leg Press');
  });
});

describe('AI rewrite guard', () => {
  const base = 'Shady, total volume is up 12.5% versus your last session.';
  it('accepts a rewrite that keeps the verified numbers', () => {
    expect(isFaithfulRewrite(base, 'يا شادي، الحجم زاد 12.5% عن آخر جلسة!')).toBe(true);
  });
  it('rejects invented, missing or malformed output', () => {
    expect(isFaithfulRewrite(base, 'Shady, volume is up 25% since last time.')).toBe(false);
    expect(isFaithfulRewrite(base, 'Great job!')).toBe(false);
    expect(isFaithfulRewrite(base, 'sorry I cannot do JSON {{{ 12.5')).toBe(false);
    expect(isFaithfulRewrite(base, 'x'.repeat(400))).toBe(false);
  });
});
