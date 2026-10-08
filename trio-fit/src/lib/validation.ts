import { z } from 'zod';
import { METRIC_KEYS } from '@/lib/domain/challenges';
import { parseYouTubeUrl } from '@/lib/domain/youtube';

/** Empty form fields arrive as ''. Turn them into undefined, otherwise parse as a number. */
const optNum = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(min).max(max).optional());
const reqNum = (min: number, max: number) => z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(min).max(max));
const optText = (max: number) => z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max).optional());
export const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');

export const MEMBER_SLUGS = ['amr', 'aman', 'shady'] as const;
export const loginSchema = z.object({
  password: z.string().min(1, 'Enter the password').max(200),
  memberSlug: z.enum(MEMBER_SLUGS, { errorMap: () => ({ message: 'Choose who you are' }) }),
});

export const measurementSchema = z
  .object({
    measuredOn: dateKey,
    weightKg: optNum(20, 400),
    heightCm: optNum(100, 250),
    bodyFatPct: optNum(2, 70),
    waistCm: optNum(30, 250),
    chestCm: optNum(30, 250),
    armCm: optNum(10, 100),
    thighCm: optNum(20, 150),
    skeletalMuscleKg: optNum(5, 100),
    bodyWaterKg: optNum(10, 200),
    visceralLevel: optNum(1, 30),
    bmrKcal: optNum(500, 6000),
    note: optText(500),
  })
  .refine(
    (v) => [v.weightKg, v.heightCm, v.bodyFatPct, v.waistCm, v.chestCm, v.armCm, v.thighCm, v.skeletalMuscleKg, v.bodyWaterKg, v.visceralLevel, v.bmrKcal].some((x) => x != null),
    { message: 'Enter at least one measurement' },
  );

export const goalsSchema = z.object({
  heightCm: optNum(100, 250),
  startWeightKg: optNum(20, 400),
  targetWeightKg: optNum(20, 400),
  targetBodyFatPct: optNum(2, 70),
  calorieTarget: optNum(800, 6000),
  proteinTargetG: optNum(20, 500),
  carbsTargetG: optNum(0, 900),
  fatTargetG: optNum(10, 300),
  waterTargetMl: optNum(500, 8000),
});

const setSchema = z.object({
  weightKg: optNum(0, 1000),
  reps: optNum(0, 500),
  restSec: optNum(0, 1800),
});
export const workoutSchema = z.object({
  id: z.string().uuid().optional(),
  performedOn: dateKey,
  title: z.string().trim().min(1, 'Give the workout a title').max(80),
  durationMin: optNum(1, 600),
  perceivedEffort: optNum(1, 10),
  notes: optText(1000),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().uuid(),
        notes: optText(300),
        durationMin: optNum(0, 600),
        distanceKm: optNum(0, 500),
        avgSpeedKmh: optNum(0, 60),
        inclinePct: optNum(0, 40),
        sets: z.array(setSchema).max(30),
      }),
    )
    .min(1, 'Add at least one exercise')
    .max(30),
});
export type WorkoutInput = z.infer<typeof workoutSchema>;

export const foodEntrySchema = z.object({
  id: z.string().uuid().optional(),
  eatenOn: dateKey,
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  name: z.string().trim().min(1, 'Name the food').max(120),
  quantity: reqNum(0.01, 100000),
  unit: z.string().trim().min(1).max(20).default('g'),
  grams: optNum(0, 100000),
  calories: reqNum(0, 10000),
  proteinG: optNum(0, 1000),
  carbsG: optNum(0, 1500),
  fatG: optNum(0, 1000),
  fiberG: optNum(0, 300),
  source: z.enum(['manual', 'openfoodfacts', 'ai_estimate', 'saved']).default('manual'),
  verified: z.preprocess((v) => v === true || v === 'true' || v === 'on', z.boolean()).default(false),
});
export type FoodEntryInput = z.infer<typeof foodEntrySchema>;

export const waterSchema = z.object({ day: dateKey, ml: reqNum(50, 5000) });
export const checkinSchema = z.object({
  day: dateKey,
  energy: optNum(1, 5),
  sleepHours: optNum(0, 16),
  stress: optNum(1, 5),
  note: optText(500),
});

export const challengeSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: optText(300),
  scope: z.enum(['individual', 'team', 'battle']),
  metric: z.enum(METRIC_KEYS as [string, ...string[]]),
  target: reqNum(1, 100),
  startsOn: dateKey,
  endsOn: dateKey,
  xpReward: optNum(0, 500),
  opponentId: z.string().uuid().optional(),
});

export const settingsSchema = z.object({
  displayName: z.string().trim().min(1).max(30),
  workoutDays: z.array(z.coerce.number().int().min(0).max(6)).max(7),
  tone: z.enum(['hype', 'calm', 'funny']),
  language: z.enum(['ar', 'en']),
  messagesEnabled: z.boolean(),
  shareBodyStats: z.boolean(),
  theme: z.enum(['light', 'dark']),
});

export const videoSchema = z.object({
  exerciseId: z.string().uuid(),
  url: z
    .string()
    .trim()
    .refine((u) => parseYouTubeUrl(u) != null, 'Enter a valid youtube.com / youtu.be video link'),
});

export type FieldErrors = Record<string, string[] | undefined>;
export function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? 'Invalid input';
}
