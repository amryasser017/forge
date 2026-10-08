import 'server-only';
import { db, must } from './db';
import { sumMacros, type Macros } from '@/lib/domain/nutrition';
import type { CheckIn, FoodLog } from '@/lib/types';
import type { FoodEntryInput } from '@/lib/validation';

export async function foodForDay(memberId: string, day: string): Promise<FoodLog[]> {
  return must(await db().from('food_logs').select('*').eq('member_id', memberId).eq('eaten_on', day).order('created_at')) as FoodLog[];
}
export async function foodRange(memberId: string, from: string, to: string): Promise<FoodLog[]> {
  return must(await db().from('food_logs').select('*').eq('member_id', memberId).gte('eaten_on', from).lte('eaten_on', to).order('eaten_on')) as FoodLog[];
}
export const macrosOf = (rows: FoodLog[]): Macros => sumMacros(rows.map((r) => ({ calories: r.calories, proteinG: r.protein_g, carbsG: r.carbs_g, fatG: r.fat_g, fiberG: r.fiber_g })));

export async function saveFood(memberId: string, f: FoodEntryInput): Promise<string> {
  const row = { member_id: memberId, eaten_on: f.eatenOn, meal_type: f.mealType, name: f.name, quantity: f.quantity, unit: f.unit, grams: f.grams ?? null, calories: f.calories, protein_g: f.proteinG ?? 0, carbs_g: f.carbsG ?? 0, fat_g: f.fatG ?? 0, fiber_g: f.fiberG ?? 0, source: f.source, verified: f.verified };
  if (f.id) {
    const { data } = await db().from('food_logs').select('member_id').eq('id', f.id).maybeSingle();
    if (!data || data.member_id !== memberId) throw new Error('Entry not found');
    must(await db().from('food_logs').update(row).eq('id', f.id));
    return f.id;
  }
  const r = must(await db().from('food_logs').insert(row).select('id').single()) as { id: string };
  return r.id;
}
export async function deleteFood(memberId: string, id: string) {
  const { data } = await db().from('food_logs').select('member_id').eq('id', id).maybeSingle();
  if (!data || data.member_id !== memberId) throw new Error('Entry not found');
  must(await db().from('food_logs').delete().eq('id', id));
}

export async function waterForDay(memberId: string, day: string): Promise<number> {
  const rows = must(await db().from('water_logs').select('ml').eq('member_id', memberId).eq('day', day)) as { ml: number }[];
  return rows.reduce((a, r) => a + r.ml, 0);
}
export async function waterByDay(memberId: string, from: string, to: string): Promise<Record<string, number>> {
  const rows = must(await db().from('water_logs').select('day, ml').eq('member_id', memberId).gte('day', from).lte('day', to)) as { day: string; ml: number }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.day] = (out[r.day] ?? 0) + r.ml;
  return out;
}
export async function addWater(memberId: string, day: string, ml: number) {
  must(await db().from('water_logs').insert({ member_id: memberId, day, ml }));
}
export async function undoLastWater(memberId: string, day: string) {
  const { data } = await db().from('water_logs').select('id').eq('member_id', memberId).eq('day', day).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (data) must(await db().from('water_logs').delete().eq('id', data.id));
}

export async function getCheckIn(memberId: string, day: string): Promise<CheckIn | null> {
  const { data } = await db().from('daily_check_ins').select('*').eq('member_id', memberId).eq('day', day).maybeSingle();
  return (data as CheckIn) ?? null;
}
export async function checkInsRange(memberId: string, from: string, to: string): Promise<CheckIn[]> {
  return must(await db().from('daily_check_ins').select('*').eq('member_id', memberId).gte('day', from).lte('day', to).order('day')) as CheckIn[];
}
export async function upsertCheckIn(memberId: string, day: string, patch: Partial<Pick<CheckIn, 'energy' | 'sleep_hours' | 'stress' | 'note' | 'food_log_complete'>>) {
  must(await db().from('daily_check_ins').upsert({ member_id: memberId, day, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'member_id,day' }));
}

export interface SavedFood {
  id: string;
  name: string;
  unit: string;
  default_quantity: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  use_count: number;
}
export async function frequentFoods(memberId: string, limit = 12): Promise<SavedFood[]> {
  return must(await db().from('food_items').select('*').eq('member_id', memberId).order('use_count', { ascending: false }).order('last_used_at', { ascending: false }).limit(limit)) as SavedFood[];
}
/** Remember a food (per portion as logged) so it can be re-added with one tap. */
export async function rememberFood(memberId: string, f: FoodEntryInput) {
  const { data } = await db().from('food_items').select('id, use_count').eq('member_id', memberId).eq('name', f.name).maybeSingle();
  const vals = { unit: f.unit, default_quantity: f.quantity, calories: f.calories, protein_g: f.proteinG ?? 0, carbs_g: f.carbsG ?? 0, fat_g: f.fatG ?? 0, fiber_g: f.fiberG ?? 0, source: f.source, last_used_at: new Date().toISOString() };
  if (data) must(await db().from('food_items').update({ ...vals, use_count: (data.use_count as number) + 1 }).eq('id', data.id));
  else must(await db().from('food_items').insert({ member_id: memberId, name: f.name, ...vals, use_count: 1 }));
}
export async function forgetFood(memberId: string, id: string) {
  must(await db().from('food_items').delete().eq('id', id).eq('member_id', memberId));
}
