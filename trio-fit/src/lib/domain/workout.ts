import { pctChange, round1 } from './body';

export interface SetInput {
  weightKg: number | null;
  reps: number | null;
}

const valid = (s: SetInput) => s.weightKg != null && s.reps != null && s.weightKg > 0 && s.reps > 0;

/** weight × reps for one resistance set; 0 when the set is incomplete. */
export const setVolume = (s: SetInput) => (valid(s) ? (s.weightKg as number) * (s.reps as number) : 0);
export const totalVolume = (sets: SetInput[]) => Math.round(sets.reduce((a, s) => a + setVolume(s), 0) * 10) / 10;
export const totalReps = (sets: SetInput[]) => sets.filter(valid).reduce((a, s) => a + (s.reps as number), 0);
export const maxWeight = (sets: SetInput[]) => sets.filter(valid).reduce((m, s) => Math.max(m, s.weightKg as number), 0);
export const hasResistanceData = (sets: SetInput[]) => sets.some(valid);

export interface Metric {
  current: number;
  previous: number;
  delta: number;
  pct: number | null;
  improved: boolean;
}
function metric(current: number, previous: number): Metric {
  return { current, previous, delta: round1(current - previous), pct: pctChange(previous, current), improved: current > previous };
}

export interface ExerciseComparison {
  /** false when there is no earlier comparable session (this one is the baseline). */
  comparable: boolean;
  weight?: Metric;
  reps?: Metric;
  volume?: Metric;
  setBySet?: { set: number; cur: SetInput; prev: SetInput | null }[];
}

/** Compare a session's sets with the latest previous session of the SAME exercise by the SAME member. */
export function compareExercise(current: SetInput[], previous: SetInput[] | null | undefined): ExerciseComparison {
  if (!previous || !hasResistanceData(current) || !hasResistanceData(previous)) return { comparable: false };
  const n = Math.max(current.length, previous.length);
  return {
    comparable: true,
    weight: metric(maxWeight(current), maxWeight(previous)),
    reps: metric(totalReps(current), totalReps(previous)),
    volume: metric(totalVolume(current), totalVolume(previous)),
    setBySet: Array.from({ length: n }, (_, i) => ({ set: i + 1, cur: current[i] ?? { weightKg: null, reps: null }, prev: previous[i] ?? null })),
  };
}

export interface PrResult {
  /** True when this is the first recorded session: it sets the baseline and cannot be a PR. */
  baseline: boolean;
  weightPr: boolean;
  volumePr: boolean;
  previousBestWeight: number;
  previousBestVolume: number;
}

/** A PR needs earlier history: heaviest weight (≥1 rep) or highest single-session volume strictly beats every earlier session. */
export function detectPrs(current: SetInput[], history: SetInput[][]): PrResult {
  const prior = history.filter(hasResistanceData);
  const previousBestWeight = prior.reduce((m, s) => Math.max(m, maxWeight(s)), 0);
  const previousBestVolume = prior.reduce((m, s) => Math.max(m, totalVolume(s)), 0);
  if (prior.length === 0 || !hasResistanceData(current)) {
    return { baseline: prior.length === 0, weightPr: false, volumePr: false, previousBestWeight, previousBestVolume };
  }
  return {
    baseline: false,
    weightPr: maxWeight(current) > previousBestWeight,
    volumePr: totalVolume(current) > previousBestVolume,
    previousBestWeight,
    previousBestVolume,
  };
}

export interface CardioInput {
  durationMin: number | null;
  distanceKm: number | null;
}
export function compareCardio(cur: CardioInput, prev: CardioInput | null | undefined) {
  if (!prev) return { comparable: false as const };
  const out: { comparable: true; duration?: Metric; distance?: Metric } = { comparable: true };
  if (cur.durationMin && prev.durationMin) out.duration = metric(cur.durationMin, prev.durationMin);
  if (cur.distanceKm && prev.distanceKm) out.distance = metric(cur.distanceKm, prev.distanceKm);
  return out;
}

/**
 * Personal improvement score: for each exercise done at least twice in the period, % change in session volume
 * from the earliest to the latest session; the score is the mean across exercises. Compares a member only with themselves.
 */
export function improvementScore(perExercise: { volumes: number[] }[]): number | null {
  const pcts = perExercise
    .filter((e) => e.volumes.length >= 2 && (e.volumes[0] ?? 0) > 0)
    .map((e) => pctChange(e.volumes[0], e.volumes[e.volumes.length - 1]))
    .filter((p): p is number => p != null);
  if (pcts.length === 0) return null;
  return round1(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}
