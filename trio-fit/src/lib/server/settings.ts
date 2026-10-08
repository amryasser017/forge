import 'server-only';
import { db } from './db';
import { env } from './env';
import { DEFAULT_XP_RULES, resolveRules, type XpRules } from '@/lib/domain/xp';

export async function getRules(): Promise<XpRules> {
  const { data } = await db().from('app_settings').select('value').eq('key', 'xp_rules').maybeSingle();
  return resolveRules(data?.value ?? DEFAULT_XP_RULES);
}
export async function saveRules(rules: XpRules) {
  await db().from('app_settings').upsert({ key: 'xp_rules', value: rules, updated_at: new Date().toISOString() });
}
export const timezone = () => env().timezone;
