import 'server-only';
import { db, must } from './db';
import type { Exercise, SessionRow, SetRow, WorkoutExerciseRow } from '@/lib/types';
import type { WorkoutInput } from '@/lib/validation';

export async function listExercises(): Promise<Exercise[]> {
  const rows = must(await db().from('exercises').select('*, exercise_category_links(exercise_categories(slug))').order('name')) as unknown as (Exercise & { exercise_category_links: { exercise_categories: { slug: string } }[] })[];
  return rows.map(({ exercise_category_links, ...e }) => ({ ...e, categories: exercise_category_links.map((l) => l.exercise_categories.slug) }));
}
export async function getExerciseBySlug(slug: string): Promise<Exercise | null> {
  const { data } = await db().from('exercises').select('*, exercise_category_links(exercise_categories(slug))').eq('slug', slug).maybeSingle();
  if (!data) return null;
  const { exercise_category_links, ...e } = data as Exercise & { exercise_category_links: { exercise_categories: { slug: string } }[] };
  return { ...e, categories: exercise_category_links.map((l) => l.exercise_categories.slug) };
}
export async function listCategories() {
  return must(await db().from('exercise_categories').select('*').order('sort_order')) as { id: string; slug: string; name: string }[];
}

/** Oldest first; sessions on the same day keep the order they were logged in. */
export const chronological = (a: SessionRow, b: SessionRow) => a.performed_on.localeCompare(b.performed_on) || (a.created_at ?? '').localeCompare(b.created_at ?? '');

const SESSION_SELECT = '*, workout_exercises(*, exercises(id, slug, name, kind, youtube_query), exercise_sets(*))';

function sortSession(s: SessionRow): SessionRow {
  const we = [...(s.workout_exercises ?? [])].sort((a, b) => a.position - b.position).map((w) => ({ ...w, exercise_sets: [...w.exercise_sets].sort((a, b) => a.set_no - b.set_no) }));
  return { ...s, workout_exercises: we };
}

export async function getSession(id: string): Promise<SessionRow | null> {
  const { data } = await db().from('workout_sessions').select(SESSION_SELECT).eq('id', id).maybeSingle();
  return data ? sortSession(data as SessionRow) : null;
}
export async function listSessions(memberId: string, opts: { limit?: number; since?: string } = {}): Promise<SessionRow[]> {
  let q = db().from('workout_sessions').select(SESSION_SELECT).eq('member_id', memberId).eq('status', 'completed').order('performed_on', { ascending: false }).order('created_at', { ascending: false });
  if (opts.since) q = q.gte('performed_on', opts.since);
  q = q.limit(opts.limit ?? 60);
  return (must(await q) as SessionRow[]).map(sortSession);
}
/** Light query: completed workout days for streak/consistency math. */
export async function workoutDays(memberId: string): Promise<string[]> {
  const rows = must(await db().from('workout_sessions').select('performed_on').eq('member_id', memberId).eq('status', 'completed')) as { performed_on: string }[];
  return [...new Set(rows.map((r) => r.performed_on))].sort();
}
export async function allWorkoutDays(): Promise<{ member_id: string; performed_on: string }[]> {
  return must(await db().from('workout_sessions').select('member_id, performed_on').eq('status', 'completed')) as { member_id: string; performed_on: string }[];
}

/** Sets of every earlier session of this exercise by this member (newest first), excluding one session id. */
export async function exerciseHistory(memberId: string, exerciseId: string, opts: { before?: string; excludeSessionId?: string; limit?: number } = {}) {
  let q = db()
    .from('workout_exercises')
    .select('id, session_id, duration_min, distance_km, avg_speed_kmh, incline_pct, exercise_sets(*), workout_sessions!inner(id, member_id, performed_on, status, created_at)')
    .eq('exercise_id', exerciseId)
    .eq('workout_sessions.member_id', memberId)
    .eq('workout_sessions.status', 'completed');
  if (opts.before) q = q.lte('workout_sessions.performed_on', opts.before);
  if (opts.excludeSessionId) q = q.neq('session_id', opts.excludeSessionId);
  const rows = must(await q) as unknown as {
    id: string;
    session_id: string;
    duration_min: number | null;
    distance_km: number | null;
    avg_speed_kmh: number | null;
    incline_pct: number | null;
    exercise_sets: SetRow[];
    workout_sessions: { performed_on: string; created_at: string };
  }[];
  rows.sort((a, b) => (a.workout_sessions.performed_on === b.workout_sessions.performed_on ? b.workout_sessions.created_at.localeCompare(a.workout_sessions.created_at) : b.workout_sessions.performed_on.localeCompare(a.workout_sessions.performed_on)));
  return rows.slice(0, opts.limit ?? 40).map((r) => ({
    sessionId: r.session_id,
    performedOn: r.workout_sessions.performed_on,
    durationMin: r.duration_min,
    distanceKm: r.distance_km,
    sets: [...r.exercise_sets].sort((a, b) => a.set_no - b.set_no),
  }));
}

/** Replaces the exercises/sets of a session atomically enough for this app (children are rebuilt on every save). */
export async function saveSession(memberId: string, input: WorkoutInput): Promise<string> {
  const client = db();
  let sessionId = input.id;
  const base = { performed_on: input.performedOn, title: input.title, duration_min: input.durationMin ?? null, perceived_effort: input.perceivedEffort ?? null, notes: input.notes ?? null, status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (sessionId) {
    const { data: existing } = await client.from('workout_sessions').select('member_id').eq('id', sessionId).maybeSingle();
    if (!existing || existing.member_id !== memberId) throw new Error('Workout not found');
    must(await client.from('workout_sessions').update(base).eq('id', sessionId));
    must(await client.from('workout_exercises').delete().eq('session_id', sessionId));
  } else {
    const row = must(await client.from('workout_sessions').insert({ ...base, member_id: memberId }).select('id').single()) as { id: string };
    sessionId = row.id;
  }
  for (const [i, ex] of input.exercises.entries()) {
    const we = must(
      await client
        .from('workout_exercises')
        .insert({ session_id: sessionId, exercise_id: ex.exerciseId, position: i, notes: ex.notes ?? null, duration_min: ex.durationMin ?? null, distance_km: ex.distanceKm ?? null, avg_speed_kmh: ex.avgSpeedKmh ?? null, incline_pct: ex.inclinePct ?? null })
        .select('id')
        .single(),
    ) as { id: string };
    const sets = ex.sets.filter((s) => s.weightKg != null || s.reps != null).map((s, n) => ({ workout_exercise_id: we.id, set_no: n + 1, weight_kg: s.weightKg ?? null, reps: s.reps ?? null, rest_sec: s.restSec ?? null }));
    if (sets.length) must(await client.from('exercise_sets').insert(sets));
  }
  return sessionId as string;
}

export async function deleteSession(memberId: string, id: string) {
  const { data } = await db().from('workout_sessions').select('member_id').eq('id', id).maybeSingle();
  if (!data || data.member_id !== memberId) throw new Error('Workout not found');
  must(await db().from('workout_sessions').delete().eq('id', id));
}

export function toWorkoutInput(s: SessionRow, performedOn: string): WorkoutInput {
  return {
    performedOn,
    title: s.title,
    durationMin: s.duration_min ?? undefined,
    perceivedEffort: s.perceived_effort ?? undefined,
    notes: s.notes ?? undefined,
    exercises: (s.workout_exercises ?? []).map((w: WorkoutExerciseRow) => ({
      exerciseId: w.exercise_id,
      notes: w.notes ?? undefined,
      durationMin: w.duration_min ?? undefined,
      distanceKm: w.distance_km ?? undefined,
      avgSpeedKmh: w.avg_speed_kmh ?? undefined,
      inclinePct: w.incline_pct ?? undefined,
      sets: w.exercise_sets.map((x) => ({ weightKg: x.weight_kg ?? undefined, reps: x.reps ?? undefined, restSec: x.rest_sec ?? undefined })),
    })),
  };
}

export interface TeamBoardRow {
  memberId: string;
  sessions: number;
  bestWeightKg: number;
  latestWeightKg: number;
  latestOn: string | null;
  firstVolume: number | null;
  latestVolume: number | null;
}
/** Per-member standing on one machine. Improvement compares each member only with their own first session. */
export async function exerciseTeamBoard(exerciseId: string): Promise<TeamBoardRow[]> {
  const rows = must(await db().from('workout_exercises').select('exercise_sets(weight_kg, reps), workout_sessions!inner(member_id, performed_on, status)').eq('exercise_id', exerciseId).eq('workout_sessions.status', 'completed')) as unknown as { exercise_sets: { weight_kg: number | null; reps: number | null }[]; workout_sessions: { member_id: string; performed_on: string } }[];
  const by: Record<string, { on: string; best: number; vol: number }[]> = {};
  for (const r of rows) {
    let best = 0, vol = 0;
    for (const s of r.exercise_sets) {
      const w = Number(s.weight_kg ?? 0), n = Number(s.reps ?? 0);
      if (w > 0 && n > 0) { best = Math.max(best, w); vol += w * n; }
    }
    (by[r.workout_sessions.member_id] ??= []).push({ on: r.workout_sessions.performed_on, best, vol });
  }
  return Object.entries(by).map(([memberId, list]) => {
    list.sort((a, b) => a.on.localeCompare(b.on));
    const last = list[list.length - 1];
    return { memberId, sessions: list.length, bestWeightKg: Math.max(...list.map((l) => l.best)), latestWeightKg: last?.best ?? 0, latestOn: last?.on ?? null, firstVolume: list[0]?.vol || null, latestVolume: last?.vol || null };
  });
}
