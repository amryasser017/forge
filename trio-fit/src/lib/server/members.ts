import 'server-only';
import { db, must } from './db';
import { levelFromXp, type LevelInfo } from '@/lib/domain/xp';
import type { Achievement, Cosmetic, Goals, Member } from '@/lib/types';

export async function listMembers(): Promise<Member[]> {
  const rows = must(await db().from('members').select('*').order('created_at').order('slug'));
  const order = ['amr', 'aman', 'shady'];
  return (rows as Member[]).sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
}
export async function getMember(id: string): Promise<Member | null> {
  const { data } = await db().from('members').select('*').eq('id', id).maybeSingle();
  return (data as Member) ?? null;
}
export async function getMemberBySlug(slug: string): Promise<Member | null> {
  const { data } = await db().from('members').select('*').eq('slug', slug).maybeSingle();
  return (data as Member) ?? null;
}
export async function getGoals(memberId: string): Promise<Goals> {
  const { data } = await db().from('member_goals').select('*').eq('member_id', memberId).maybeSingle();
  return (data as Goals) ?? ({ member_id: memberId, height_cm: null, start_weight_kg: null, target_weight_kg: null, target_body_fat_pct: null, calorie_target: null, protein_target_g: null, carbs_target_g: null, fat_target_g: null, water_target_ml: 2500 } as Goals);
}
export async function allGoals(): Promise<Record<string, Goals>> {
  const rows = must(await db().from('member_goals').select('*')) as Goals[];
  return Object.fromEntries(rows.map((g) => [g.member_id, g]));
}

export interface Totals {
  xp: number;
  coins: number;
  level: LevelInfo;
}
export async function getTotals(): Promise<Record<string, Totals>> {
  const rows = must(await db().from('member_totals').select('*')) as { member_id: string; xp_total: number; coins_total: number }[];
  return Object.fromEntries(rows.map((r) => [r.member_id, { xp: r.xp_total, coins: r.coins_total, level: levelFromXp(r.xp_total) }]));
}
export async function getTotalsFor(memberId: string): Promise<Totals> {
  return (await getTotals())[memberId] ?? { xp: 0, coins: 0, level: levelFromXp(0) };
}

export async function memberAchievements(memberId: string): Promise<(Achievement & { earned_at: string })[]> {
  const rows = must(await db().from('member_achievements').select('earned_at, achievements(*)').eq('member_id', memberId).order('earned_at', { ascending: false })) as unknown as { earned_at: string; achievements: Achievement }[];
  return rows.map((r) => ({ ...r.achievements, earned_at: r.earned_at }));
}
export async function allAchievements(): Promise<Achievement[]> {
  return must(await db().from('achievements').select('*').order('xp_reward')) as Achievement[];
}
export async function cosmeticCatalog(memberId: string): Promise<(Cosmetic & { owned: boolean })[]> {
  const items = must(await db().from('cosmetic_items').select('*').order('cost_coins')) as Cosmetic[];
  const owned = must(await db().from('member_cosmetics').select('item_id').eq('member_id', memberId)) as { item_id: string }[];
  const set = new Set(owned.map((o) => o.item_id));
  return items.map((i) => ({ ...i, owned: set.has(i.id) || i.cost_coins === 0 }));
}
export async function cosmeticsByKey(): Promise<Record<string, Cosmetic>> {
  const items = must(await db().from('cosmetic_items').select('*')) as Cosmetic[];
  return Object.fromEntries(items.map((i) => [i.key, i]));
}
