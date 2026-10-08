'use server';

import { guarded, formObject, parse } from '@/lib/server/action';
import { db, must } from '@/lib/server/db';
import { saveRules } from '@/lib/server/settings';
import { runGame } from '@/lib/server/game';
import { DEFAULT_XP_RULES, resolveRules } from '@/lib/domain/xp';
import { settingsSchema } from '@/lib/validation';
import type { ActionResult } from '@/lib/types';

export async function saveSettingsAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guarded(async (s) => {
    const raw = formObject(fd);
    const p = parse(settingsSchema, {
      displayName: raw.displayName,
      workoutDays: fd.getAll('workoutDays'),
      tone: raw.tone,
      language: raw.language,
      messagesEnabled: fd.get('messagesEnabled') === 'on',
      shareBodyStats: fd.get('shareBodyStats') === 'on',
      theme: raw.theme,
    });
    if (!p.ok) return p.result;
    const d = p.data;
    must(await db().from('members').update({ display_name: d.displayName, workout_days: [...new Set(d.workoutDays)].sort(), tone: d.tone, language: d.language, messages_enabled: d.messagesEnabled, share_body_stats: d.shareBodyStats, theme: d.theme }).eq('id', s.memberId));
    await runGame(s.memberId, { type: 'sync' });
    return { ok: true, message: 'Settings saved' };
  });
}

export async function setThemeAction(theme: 'light' | 'dark'): Promise<ActionResult> {
  return guarded(async (s) => {
    must(await db().from('members').update({ theme: theme === 'dark' ? 'dark' : 'light' }).eq('id', s.memberId));
    return { ok: true };
  });
}

export async function saveRulesAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const next: Record<string, number> = {};
    for (const k of Object.keys(DEFAULT_XP_RULES)) next[k] = Number(fd.get(k));
    await saveRules(resolveRules(next));
    return { ok: true, message: 'Reward values saved. They apply to future rewards only.' };
  });
}
