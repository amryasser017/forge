import { describe, expect, it } from 'vitest';
import { SESSION_COOKIE, signSession, verifySession } from '@/lib/server/session-token';
import { hashPassword, safeEqual, verifyGatePassword } from '@/lib/server/password';
import { isRateLimited, LOGIN_MAX_FAILURES } from '@/lib/server/rate-limit';
import { ForbiddenError, assertOwner } from '@/lib/server/guard';
import { extractJson } from '@/lib/ai/json';
import { challengeSchema, foodEntrySchema, loginSchema, measurementSchema, videoSchema, workoutSchema } from '@/lib/validation';

const SECRET = 'a'.repeat(40);
const MEMBER = { memberId: '00000000-0000-4000-8000-000000000003', slug: 'shady' };

describe('session tokens', () => {
  it('round-trips a signed session', async () => {
    const t = await signSession(MEMBER, SECRET);
    expect(await verifySession(t, SECRET)).toEqual(MEMBER);
  });
  it('rejects tampering, wrong secret, expiry, junk and a short server secret', async () => {
    const t = await signSession(MEMBER, SECRET);
    expect(await verifySession(t.slice(0, -2) + 'xx', SECRET)).toBeNull();
    expect(await verifySession(t, 'b'.repeat(40))).toBeNull();
    expect(await verifySession(await signSession(MEMBER, SECRET, Date.now() - 20 * 86400_000), SECRET)).toBeNull();
    expect(await verifySession('not.a.token', SECRET)).toBeNull();
    expect(await verifySession(undefined, SECRET)).toBeNull();
    expect(await verifySession(t, 'short')).toBeNull();
  });
  it('uses a stable cookie name', () => expect(SESSION_COOKIE).toBe('trio_session'));
});

describe('crew password gate', () => {
  it('verifies a plain server-side secret in constant time', () => {
    expect(verifyGatePassword('open-sesame', { hash: '', plain: 'open-sesame' })).toBe(true);
    expect(verifyGatePassword('nope', { hash: '', plain: 'open-sesame' })).toBe(false);
    expect(verifyGatePassword('', { hash: '', plain: '' })).toBe(false);
    expect(safeEqual('a', 'a')).toBe(true);
    expect(safeEqual('a', 'ab')).toBe(false);
  });
  it('verifies a scrypt hash and prefers it over the plain value', () => {
    const h = hashPassword('open-sesame');
    expect(h.startsWith('scrypt:')).toBe(true);
    expect(verifyGatePassword('open-sesame', { hash: h, plain: 'other' })).toBe(true);
    expect(verifyGatePassword('other', { hash: h, plain: 'other' })).toBe(false);
    expect(verifyGatePassword('x', { hash: 'garbage', plain: 'x' })).toBe(false);
  });
  it('rate-limits after repeated failures', () => {
    expect(isRateLimited(LOGIN_MAX_FAILURES - 1)).toBe(false);
    expect(isRateLimited(LOGIN_MAX_FAILURES)).toBe(true);
  });
});

describe('authorization guard (member data isolation)', () => {
  it('allows owners and blocks everyone else, including missing owners', () => {
    expect(() => assertOwner('a', 'a')).not.toThrow();
    expect(() => assertOwner('a', 'b')).toThrow(ForbiddenError);
    expect(() => assertOwner('a', null)).toThrow(ForbiddenError);
    expect(() => assertOwner('a', undefined)).toThrow(ForbiddenError);
  });
});

describe('input validation', () => {
  it('login needs a known member and a password', () => {
    expect(loginSchema.safeParse({ password: 'x', memberSlug: 'amr' }).success).toBe(true);
    expect(loginSchema.safeParse({ password: 'x', memberSlug: 'mallory' }).success).toBe(false);
    expect(loginSchema.safeParse({ password: '', memberSlug: 'amr' }).success).toBe(false);
  });
  it('measurements: empty strings are "missing", ranges enforced, at least one value required', () => {
    const ok = measurementSchema.safeParse({ measuredOn: '2026-10-01', weightKg: '85.5', bodyFatPct: '', heightCm: '' });
    expect(ok.success && ok.data.weightKg).toBe(85.5);
    expect(ok.success && ok.data.bodyFatPct).toBeUndefined();
    expect(measurementSchema.safeParse({ measuredOn: '2026-10-01' }).success).toBe(false);
    expect(measurementSchema.safeParse({ measuredOn: '2026-10-01', weightKg: '5' }).success).toBe(false);
    expect(measurementSchema.safeParse({ measuredOn: '2026-10-01', bodyFatPct: '150' }).success).toBe(false);
    expect(measurementSchema.safeParse({ measuredOn: 'yesterday', weightKg: '80' }).success).toBe(false);
  });
  const ex = '00000000-0000-4000-8000-0000000000aa';
  it('workouts: need a title and at least one exercise; blank sets allowed', () => {
    expect(workoutSchema.safeParse({ performedOn: '2026-10-01', title: 'Legs', exercises: [{ exerciseId: ex, sets: [{ weightKg: '80', reps: '10', restSec: '' }] }] }).success).toBe(true);
    expect(workoutSchema.safeParse({ performedOn: '2026-10-01', title: '', exercises: [{ exerciseId: ex, sets: [] }] }).success).toBe(false);
    expect(workoutSchema.safeParse({ performedOn: '2026-10-01', title: 'x', exercises: [] }).success).toBe(false);
    expect(workoutSchema.safeParse({ performedOn: '2026-10-01', title: 'x', exercises: [{ exerciseId: 'nope', sets: [] }] }).success).toBe(false);
    expect(workoutSchema.safeParse({ performedOn: '2026-10-01', title: 'x', exercises: [{ exerciseId: ex, sets: [{ weightKg: '-5', reps: '10' }] }] }).success).toBe(false);
  });
  it('food entries: name, positive quantity, non-negative calories, only known sources', () => {
    const base = { eatenOn: '2026-10-01', mealType: 'lunch', name: 'Rice', quantity: '200', unit: 'g', calories: '260' };
    expect(foodEntrySchema.safeParse(base).success).toBe(true);
    expect(foodEntrySchema.safeParse({ ...base, calories: '-1' }).success).toBe(false);
    expect(foodEntrySchema.safeParse({ ...base, quantity: '0' }).success).toBe(false);
    expect(foodEntrySchema.safeParse({ ...base, source: 'trust-me' }).success).toBe(false);
    expect(foodEntrySchema.safeParse({ ...base, mealType: 'brunch' }).success).toBe(false);
  });
  it('challenges and videos', () => {
    expect(challengeSchema.safeParse({ title: 'Four', scope: 'team', metric: 'workout_sessions', target: '4', startsOn: '2026-10-04', endsOn: '2026-10-10' }).success).toBe(true);
    expect(challengeSchema.safeParse({ title: 'Four', scope: 'team', metric: 'lose_weight', target: '4', startsOn: '2026-10-04', endsOn: '2026-10-10' }).success).toBe(false);
    expect(videoSchema.safeParse({ exerciseId: ex, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }).success).toBe(true);
    expect(videoSchema.safeParse({ exerciseId: ex, url: 'https://evil.example/watch?v=dQw4w9WgXcQ' }).success).toBe(false);
  });
});

describe('AI output parsing', () => {
  it('extracts JSON from fenced or chatty replies and throws on nothing', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Sure! {"a":[1,2]} hope that helps')).toEqual({ a: [1, 2] });
    expect(() => extractJson('no json here')).toThrow();
    expect(() => extractJson('{broken')).toThrow();
  });
});
