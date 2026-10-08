'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db, must } from '@/lib/server/db';
import { guarded, formObject, parse } from '@/lib/server/action';
import { assertOwner } from '@/lib/server/guard';
import { runGame } from '@/lib/server/game';
import { goalsSchema, measurementSchema } from '@/lib/validation';
import type { ActionResult } from '@/lib/types';

export async function saveMeasurementAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guarded(async (s) => {
    const p = parse(measurementSchema, formObject(fd));
    if (!p.ok) return p.result;
    const d = p.data;
    const id = z.string().uuid().safeParse(fd.get('id'));
    const row = { member_id: s.memberId, measured_on: d.measuredOn, weight_kg: d.weightKg ?? null, height_cm: d.heightCm ?? null, body_fat_pct: d.bodyFatPct ?? null, waist_cm: d.waistCm ?? null, chest_cm: d.chestCm ?? null, arm_cm: d.armCm ?? null, thigh_cm: d.thighCm ?? null, skeletal_muscle_kg: d.skeletalMuscleKg ?? null, body_water_kg: d.bodyWaterKg ?? null, visceral_level: d.visceralLevel ?? null, bmr_kcal: d.bmrKcal ?? null, note: d.note ?? null, updated_at: new Date().toISOString() };
    if (id.success) {
      const { data } = await db().from('body_measurements').select('member_id').eq('id', id.data).maybeSingle();
      assertOwner(s.memberId, data?.member_id as string | undefined);
      must(await db().from('body_measurements').update(row).eq('id', id.data));
      return { ok: true, message: 'Measurement updated' };
    }
    must(await db().from('body_measurements').insert(row));
    const reward = await runGame(s.memberId, { type: 'measurement', day: d.measuredOn });
    return { ok: true, message: 'Measurement saved', reward };
  });
}

export async function deleteMeasurementAction(id: string): Promise<ActionResult> {
  return guarded(async (s) => {
    const { data } = await db().from('body_measurements').select('member_id').eq('id', id).maybeSingle();
    assertOwner(s.memberId, data?.member_id as string | undefined);
    must(await db().from('body_measurements').delete().eq('id', id));
    return { ok: true, message: 'Measurement deleted' };
  });
}

export async function saveGoalsAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guarded(async (s) => {
    const p = parse(goalsSchema, formObject(fd));
    if (!p.ok) return p.result;
    const d = p.data;
    must(await db().from('member_goals').upsert({ member_id: s.memberId, height_cm: d.heightCm ?? null, start_weight_kg: d.startWeightKg ?? null, target_weight_kg: d.targetWeightKg ?? null, target_body_fat_pct: d.targetBodyFatPct ?? null, calorie_target: d.calorieTarget ?? null, protein_target_g: d.proteinTargetG ?? null, carbs_target_g: d.carbsTargetG ?? null, fat_target_g: d.fatTargetG ?? null, water_target_ml: d.waterTargetMl ?? 2500, updated_at: new Date().toISOString() }));
    return { ok: true, message: 'Goals saved' };
  });
}

const MAX_PHOTO = 6 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function uploadPhotoAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guarded(async (s) => {
    const file = fd.get('photo');
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose a photo first' };
    const ext = PHOTO_TYPES[file.type];
    if (!ext) return { ok: false, error: 'Photos must be JPG, PNG or WebP' };
    if (file.size > MAX_PHOTO) return { ok: false, error: 'Photo is too large (max 6 MB)' };
    const takenOn = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(fd.get('takenOn'));
    if (!takenOn.success) return { ok: false, error: 'Pick the photo date' };
    const path = `${s.memberId}/${randomUUID()}.${ext}`;
    const up = await db().storage.from('progress-photos').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (up.error) return { ok: false, error: 'Upload failed. Make sure the "progress-photos" storage bucket exists (migration 0002).' };
    must(await db().from('progress_photos').insert({ member_id: s.memberId, taken_on: takenOn.data, storage_path: path, visibility: 'private', note: (fd.get('note') as string | null)?.slice(0, 200) || null }));
    return { ok: true, message: 'Photo saved privately' };
  });
}

export async function setPhotoVisibilityAction(id: string, visibility: 'private' | 'shared'): Promise<ActionResult> {
  return guarded(async (s) => {
    const { data } = await db().from('progress_photos').select('member_id').eq('id', id).maybeSingle();
    assertOwner(s.memberId, data?.member_id as string | undefined);
    must(await db().from('progress_photos').update({ visibility }).eq('id', id));
    return { ok: true, message: visibility === 'shared' ? 'Shared with the crew' : 'Photo is private again' };
  });
}

export async function deletePhotoAction(id: string): Promise<ActionResult> {
  return guarded(async (s) => {
    const { data } = await db().from('progress_photos').select('member_id, storage_path').eq('id', id).maybeSingle();
    assertOwner(s.memberId, data?.member_id as string | undefined);
    await db().storage.from('progress-photos').remove([data!.storage_path as string]);
    must(await db().from('progress_photos').delete().eq('id', id));
    return { ok: true, message: 'Photo deleted' };
  });
}
