'use server';

import { z } from 'zod';
import { guarded, parse } from '@/lib/server/action';
import { db, must } from '@/lib/server/db';
import { assertOwner } from '@/lib/server/guard';
import { runGame } from '@/lib/server/game';
import { deleteSession, getSession, saveSession, toWorkoutInput } from '@/lib/server/workouts';
import { parseYouTubeUrl, watchUrl } from '@/lib/domain/youtube';
import { videoSchema, workoutSchema } from '@/lib/validation';
import type { ActionResult } from '@/lib/types';

/** Called with a plain object from the workout logger (not FormData). The server decides rewards. */
export async function saveWorkoutAction(payload: unknown): Promise<ActionResult> {
  return guarded(async (s) => {
    const p = parse(workoutSchema, payload);
    if (!p.ok) return p.result;
    const id = await saveSession(s.memberId, p.data);
    const reward = await runGame(s.memberId, { type: 'workout', sessionId: id, performedOn: p.data.performedOn });
    return { ok: true, message: 'Workout saved', reward, redirectTo: `/workouts/${id}` };
  });
}

export async function deleteWorkoutAction(id: string): Promise<ActionResult> {
  return guarded(async (s) => {
    await deleteSession(s.memberId, id);
    await runGame(s.memberId, { type: 'sync' }); // refresh challenge progress after removing a session
    return { ok: true, message: 'Workout deleted', redirectTo: '/workouts' };
  });
}

export async function duplicateWorkoutAction(id: string, performedOn: string): Promise<ActionResult> {
  return guarded(async (s) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(performedOn)) return { ok: false, error: 'Invalid date' };
    const src = await getSession(id);
    assertOwner(s.memberId, src?.member_id);
    const newId = await saveSession(s.memberId, toWorkoutInput(src!, performedOn));
    const reward = await runGame(s.memberId, { type: 'workout', sessionId: newId, performedOn });
    return { ok: true, message: 'Workout duplicated', reward, redirectTo: `/workouts/${newId}/edit` };
  });
}

/** Stores a YouTube link only after validating the shape AND checking it exists via YouTube's oEmbed endpoint. */
export async function setExerciseVideoAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const p = parse(videoSchema, { exerciseId: fd.get('exerciseId'), url: fd.get('url') });
    if (!p.ok) return p.result;
    const videoId = parseYouTubeUrl(p.data.url) as string;
    let title: string | null = null;
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl(videoId))}&format=json`, { signal: AbortSignal.timeout(6000) });
      if (r.status === 404 || r.status === 401 || r.status === 400) return { ok: false, error: 'YouTube says this video does not exist or cannot be embedded.' };
      if (r.ok) title = ((await r.json()) as { title?: string }).title ?? null;
    } catch {
      return { ok: false, error: 'Could not reach YouTube to verify this link. Try again in a moment.' };
    }
    must(await db().from('exercises').update({ youtube_url: watchUrl(videoId), youtube_video_id: videoId, youtube_title: title, youtube_verified_at: new Date().toISOString() }).eq('id', p.data.exerciseId));
    return { ok: true, message: title ? `Video saved: ${title}` : 'Video saved' };
  });
}

export async function clearExerciseVideoAction(exerciseId: string): Promise<ActionResult> {
  return guarded(async () => {
    if (!z.string().uuid().safeParse(exerciseId).success) return { ok: false, error: 'Invalid exercise' };
    must(await db().from('exercises').update({ youtube_url: null, youtube_video_id: null, youtube_title: null, youtube_verified_at: null }).eq('id', exerciseId));
    return { ok: true, message: 'Video removed' };
  });
}

const customSchema = z.object({ name: z.string().trim().min(2).max(60), kind: z.enum(['resistance', 'cardio']), equipment: z.string().trim().max(60).optional(), muscles: z.string().trim().max(120).optional() });
export async function createExerciseAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guarded(async (s) => {
    const p = parse(customSchema, { name: fd.get('name'), kind: fd.get('kind'), equipment: fd.get('equipment') || undefined, muscles: fd.get('muscles') || undefined });
    if (!p.ok) return p.result;
    const slug = `custom-${p.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Math.random().toString(36).slice(2, 6)}`;
    const ex = must(await db().from('exercises').insert({ slug, name: p.data.name, kind: p.data.kind, equipment: p.data.equipment ?? null, primary_muscles: p.data.muscles ? p.data.muscles.split(',').map((m) => m.trim()).filter(Boolean) : [], is_custom: true, created_by: s.memberId, youtube_query: `${p.data.name} proper form tutorial` }).select('id').single()) as { id: string };
    const cat = await db().from('exercise_categories').select('id').eq('slug', p.data.kind === 'cardio' ? 'cardio' : 'free-weights').maybeSingle();
    if (cat.data) await db().from('exercise_category_links').insert({ exercise_id: ex.id, category_id: cat.data.id });
    return { ok: true, message: 'Exercise added to the library' };
  });
}

export interface LastExercise {
  performedOn: string;
  sets: { weightKg: number | null; reps: number | null }[];
  durationMin: number | null;
  distanceKm: number | null;
}
/** Most recent earlier session of this exercise for the signed-in member (used for "last time" and Copy Last Workout). */
export async function lastExerciseAction(exerciseId: string, before?: string, excludeSessionId?: string): Promise<LastExercise | null> {
  const r = await guarded(async (s) => {
    if (!z.string().uuid().safeParse(exerciseId).success) return { ok: false, error: 'Invalid exercise' };
    const { exerciseHistory } = await import('@/lib/server/workouts');
    const h = await exerciseHistory(s.memberId, exerciseId, { before, excludeSessionId, limit: 1 });
    const last = h[0];
    return { ok: true, data: last ? { performedOn: last.performedOn, sets: last.sets.map((x) => ({ weightKg: x.weight_kg == null ? null : Number(x.weight_kg), reps: x.reps })), durationMin: last.durationMin, distanceKm: last.distanceKm } : null };
  });
  return r.ok ? (r.data as LastExercise | null) : null;
}
