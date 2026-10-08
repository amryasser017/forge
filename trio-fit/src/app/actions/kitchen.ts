'use server';

import { z } from 'zod';
import { guarded, formObject, parse } from '@/lib/server/action';
import { db, must } from '@/lib/server/db';
import { assertOwner } from '@/lib/server/guard';
import { runGame } from '@/lib/server/game';
import { addWater, deleteFood, foodForDay, forgetFood, rememberFood, saveFood, undoLastWater, upsertCheckIn } from '@/lib/server/nutrition';
import { searchFoods, type FoodHit } from '@/lib/server/foodsearch';
import { parseFoodText, type FoodDraft } from '@/lib/ai/coach';
import { checkinSchema, dateKey, foodEntrySchema, waterSchema } from '@/lib/validation';
import type { ActionResult } from '@/lib/types';

export async function saveFoodAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guarded(async (s) => {
    const p = parse(foodEntrySchema, formObject(fd));
    if (!p.ok) return p.result;
    await saveFood(s.memberId, p.data);
    if (fd.get('remember') === 'on') await rememberFood(s.memberId, p.data);
    return { ok: true, message: p.data.id ? 'Entry updated' : 'Food added' };
  });
}

export async function saveFoodDraftAction(items: FoodDraft, day: string, mealType: string): Promise<ActionResult> {
  return guarded(async (s) => {
    for (const it of items) {
      const p = parse(foodEntrySchema, { eatenOn: day, mealType, name: it.name, quantity: it.quantity, unit: it.unit, grams: it.grams ?? undefined, calories: it.calories, proteinG: it.proteinG, carbsG: it.carbsG, fatG: it.fatG, source: 'ai_estimate', verified: false });
      if (!p.ok) return p.result;
      await saveFood(s.memberId, p.data);
    }
    return { ok: true, message: `${items.length} item${items.length > 1 ? 's' : ''} saved as estimates` };
  });
}

export async function deleteFoodAction(id: string): Promise<ActionResult> {
  return guarded(async (s) => {
    await deleteFood(s.memberId, id);
    return { ok: true, message: 'Entry deleted' };
  });
}

export async function addWaterAction(day: string, ml: number): Promise<ActionResult> {
  return guarded(async (s) => {
    const p = parse(waterSchema, { day, ml });
    if (!p.ok) return p.result;
    await addWater(s.memberId, p.data.day, p.data.ml);
    const reward = await runGame(s.memberId, { type: 'water', day: p.data.day });
    return { ok: true, message: `+${p.data.ml} ml`, reward };
  });
}
export async function undoWaterAction(day: string): Promise<ActionResult> {
  return guarded(async (s) => {
    if (!dateKey.safeParse(day).success) return { ok: false, error: 'Invalid day' };
    await undoLastWater(s.memberId, day);
    return { ok: true, message: 'Last water entry removed' };
  });
}

export async function saveCheckInAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guarded(async (s) => {
    const p = parse(checkinSchema, formObject(fd));
    if (!p.ok) return p.result;
    await upsertCheckIn(s.memberId, p.data.day, { energy: p.data.energy ?? null, sleep_hours: p.data.sleepHours ?? null, stress: p.data.stress ?? null, note: p.data.note ?? null });
    const reward = await runGame(s.memberId, { type: 'checkin', day: p.data.day });
    return { ok: true, message: 'Check-in saved', reward };
  });
}

/** "Complete & honest": requires at least two logged items; the member attests the day is fully logged. */
export async function completeFoodDayAction(day: string, complete: boolean): Promise<ActionResult> {
  return guarded(async (s) => {
    if (!dateKey.safeParse(day).success) return { ok: false, error: 'Invalid day' };
    if (complete) {
      const rows = await foodForDay(s.memberId, day);
      if (rows.length < 2) return { ok: false, error: 'Log at least two food items before marking the day complete.' };
    }
    await upsertCheckIn(s.memberId, day, { food_log_complete: complete });
    const reward = complete ? await runGame(s.memberId, { type: 'food', day }) : undefined;
    return { ok: true, message: complete ? 'Day marked as fully logged' : 'Day reopened', reward };
  });
}

export async function searchFoodsAction(q: string): Promise<{ hits: FoodHit[]; error?: string }> {
  return guarded(async () => ({ ok: true, data: await searchFoods(q) })).then((r) => (r.ok ? (r.data as { hits: FoodHit[]; error?: string }) : { hits: [], error: r.error }));
}

export async function parseFoodAiAction(text: string): Promise<{ items: FoodDraft | null; reason?: string }> {
  const r = await guarded(async () => ({ ok: true, data: await parseFoodText(text) }));
  return r.ok ? (r.data as { items: FoodDraft | null; reason?: string }) : { items: null, reason: r.error };
}

export async function addSavedFoodAction(savedId: string, day: string, mealType: string): Promise<ActionResult> {
  return guarded(async (s) => {
    const { data } = await db().from('food_items').select('*').eq('id', savedId).maybeSingle();
    assertOwner(s.memberId, data?.member_id as string | undefined);
    const f = data as Record<string, number | string>;
    const p = parse(foodEntrySchema, { eatenOn: day, mealType, name: f.name, quantity: f.default_quantity, unit: f.unit, calories: f.calories, proteinG: f.protein_g, carbsG: f.carbs_g, fatG: f.fat_g, fiberG: f.fiber_g, source: 'saved', verified: false });
    if (!p.ok) return p.result;
    await saveFood(s.memberId, p.data);
    await rememberFood(s.memberId, p.data);
    return { ok: true, message: `${f.name} added` };
  });
}
export async function forgetSavedFoodAction(id: string): Promise<ActionResult> {
  return guarded(async (s) => {
    await forgetFood(s.memberId, id);
    return { ok: true, message: 'Removed from quick-add' };
  });
}

export async function saveMealAction(name: string, mealType: string, day: string): Promise<ActionResult> {
  return guarded(async (s) => {
    const n = z.string().trim().min(2).max(60).safeParse(name);
    if (!n.success) return { ok: false, error: 'Give the meal a name (2-60 characters)' };
    const rows = (await foodForDay(s.memberId, day)).filter((r) => r.meal_type === mealType);
    if (!rows.length) return { ok: false, error: 'Nothing logged for that meal yet' };
    must(await db().from('saved_meals').upsert({ member_id: s.memberId, name: n.data, meal_type: mealType, items: rows.map((r) => ({ name: r.name, quantity: r.quantity, unit: r.unit, grams: r.grams, calories: r.calories, proteinG: r.protein_g, carbsG: r.carbs_g, fatG: r.fat_g, fiberG: r.fiber_g, source: r.source })) }, { onConflict: 'member_id,name' }));
    return { ok: true, message: 'Meal saved for one-tap reuse' };
  });
}
export async function addSavedMealAction(mealId: string, day: string, mealType: string): Promise<ActionResult> {
  return guarded(async (s) => {
    const { data } = await db().from('saved_meals').select('member_id, items').eq('id', mealId).maybeSingle();
    assertOwner(s.memberId, data?.member_id as string | undefined);
    for (const it of data!.items as Record<string, number | string | null>[]) {
      const p = parse(foodEntrySchema, { eatenOn: day, mealType, ...it, grams: it.grams ?? undefined, source: 'saved', verified: false });
      if (p.ok) await saveFood(s.memberId, p.data);
    }
    return { ok: true, message: 'Meal added' };
  });
}
export async function deleteSavedMealAction(id: string): Promise<ActionResult> {
  return guarded(async (s) => {
    must(await db().from('saved_meals').delete().eq('id', id).eq('member_id', s.memberId));
    return { ok: true, message: 'Saved meal removed' };
  });
}
