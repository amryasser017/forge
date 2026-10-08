import 'server-only';
import { db, must } from './db';
import type { Measurement } from '@/lib/types';

export async function listMeasurements(memberId: string, limit = 400): Promise<Measurement[]> {
  return must(await db().from('body_measurements').select('*').eq('member_id', memberId).order('measured_on', { ascending: true }).order('created_at', { ascending: true }).limit(limit)) as Measurement[];
}
export async function latestMeasurements(): Promise<Record<string, { weight: Measurement | null; fat: Measurement | null }>> {
  const rows = must(await db().from('body_measurements').select('*').order('measured_on', { ascending: false }).order('created_at', { ascending: false }).limit(300)) as Measurement[];
  const out: Record<string, { weight: Measurement | null; fat: Measurement | null }> = {};
  for (const r of rows) {
    const o = (out[r.member_id] ??= { weight: null, fat: null });
    if (!o.weight && r.weight_kg != null) o.weight = r;
    if (!o.fat && r.body_fat_pct != null) o.fat = r;
  }
  return out;
}
