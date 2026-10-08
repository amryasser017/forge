import 'server-only';
import { compareCardio, compareExercise, detectPrs, totalVolume, maxWeight, type ExerciseComparison } from '@/lib/domain/workout';
import type { SessionRow, SetRow } from '@/lib/types';
import { exerciseHistory } from './workouts';

const toSets = (rows: SetRow[]) => rows.map((s) => ({ weightKg: s.weight_kg == null ? null : Number(s.weight_kg), reps: s.reps }));

export interface ExerciseReport {
  workoutExerciseId: string;
  exerciseId: string;
  name: string;
  slug: string;
  kind: 'resistance' | 'cardio';
  sets: SetRow[];
  volume: number;
  maxWeight: number;
  previous: { sessionId: string; performedOn: string; sets: SetRow[]; durationMin: number | null; distanceKm: number | null } | null;
  comparison: ExerciseComparison | null;
  cardio: ReturnType<typeof compareCardio> | null;
  cardioCurrent?: { durationMin: number | null; distanceKm: number | null };
  weightPr: boolean;
  volumePr: boolean;
  baseline: boolean;
  bestEverWeight: number;
}
export interface SessionReport {
  exercises: ExerciseReport[];
  totalVolume: number;
  previousTotalVolume: number | null;
  /** Volume change across exercises that have a comparable earlier session. null if none. */
  volumePct: number | null;
  prNames: string[];
}

/** Compare a session with the member's own earlier sessions of the same exercises. Deterministic, no AI. */
export async function buildSessionReport(memberId: string, s: SessionRow): Promise<SessionReport> {
  const exercises: ExerciseReport[] = [];
  for (const we of s.workout_exercises ?? []) {
    const ex = we.exercises;
    if (!ex) continue;
    const history = await exerciseHistory(memberId, we.exercise_id, { before: s.performed_on, excludeSessionId: s.id });
    const prev = history[0] ?? null;
    const cur = toSets(we.exercise_sets);
    const isCardio = ex.kind === 'cardio';
    const pr = isCardio ? { baseline: history.length === 0, weightPr: false, volumePr: false, previousBestWeight: 0, previousBestVolume: 0 } : detectPrs(cur, history.map((h) => toSets(h.sets)));
    exercises.push({
      workoutExerciseId: we.id,
      exerciseId: we.exercise_id,
      name: ex.name,
      slug: ex.slug,
      kind: ex.kind,
      sets: we.exercise_sets,
      volume: totalVolume(cur),
      maxWeight: maxWeight(cur),
      previous: prev ? { sessionId: prev.sessionId, performedOn: prev.performedOn, sets: prev.sets, durationMin: prev.durationMin, distanceKm: prev.distanceKm } : null,
      comparison: isCardio ? null : compareExercise(cur, prev ? toSets(prev.sets) : null),
      cardio: isCardio ? compareCardio({ durationMin: we.duration_min, distanceKm: we.distance_km }, prev ? { durationMin: prev.durationMin, distanceKm: prev.distanceKm } : null) : null,
      cardioCurrent: isCardio ? { durationMin: we.duration_min, distanceKm: we.distance_km } : undefined,
      weightPr: pr.weightPr,
      volumePr: pr.volumePr,
      baseline: pr.baseline,
      bestEverWeight: Math.max(pr.previousBestWeight, maxWeight(cur)),
    });
  }
  const comparable = exercises.filter((e) => e.comparison?.comparable);
  const cur = comparable.reduce((a, e) => a + (e.comparison?.volume?.current ?? 0), 0);
  const prev = comparable.reduce((a, e) => a + (e.comparison?.volume?.previous ?? 0), 0);
  return {
    exercises,
    totalVolume: Math.round(exercises.reduce((a, e) => a + e.volume, 0)),
    previousTotalVolume: comparable.length ? Math.round(prev) : null,
    volumePct: comparable.length && prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null,
    prNames: exercises.filter((e) => e.weightPr).map((e) => e.name),
  };
}
