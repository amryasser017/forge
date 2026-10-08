'use server';

import { z } from 'zod';
import { guarded } from '@/lib/server/action';
import { saveInsight } from '@/lib/server/insights';
import { askCoach, coachSummary } from '@/lib/ai/coach';
import type { ActionResult } from '@/lib/types';

export async function askCoachAction(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guarded(async (s) => {
    const q = z.string().trim().min(3, 'Ask a question (at least 3 characters)').max(500).safeParse(fd.get('question'));
    if (!q.success) return { ok: false, error: q.error.issues[0]?.message };
    const r = await askCoach(s.memberId, q.data);
    if (!r.answer) return { ok: false, error: r.reason ?? 'The coach could not answer right now.' };
    return { ok: true, data: { answer: r.answer, question: q.data } };
  });
}

export async function generateSummaryAction(): Promise<ActionResult> {
  return guarded(async (s) => {
    const sum = await coachSummary(s.memberId);
    if (!sum.narrative) return { ok: false, error: sum.aiConfigured ? 'The AI service is unavailable right now. The data-based summary below still works.' : 'AI is not configured yet (add ANTHROPIC_API_KEY on the server). The data-based summary below works without it.' };
    await saveInsight({ memberId: s.memberId, kind: 'summary', body: sum.narrative, source: 'ai', eventKey: `summary:${s.memberId}:${Date.now()}`, facts: sum.digest });
    return { ok: true, message: 'New summary written' };
  });
}

export async function mealIdeasAction(remainingCalories: number | null, remainingProtein: number | null) {
  const r = await guarded(async (s) => {
    const { mealIdeas } = await import('@/lib/ai/coach');
    return { ok: true, data: await mealIdeas(s.memberId, { calories: remainingCalories, proteinG: remainingProtein }) };
  });
  return r.ok ? (r.data as Awaited<ReturnType<typeof import('@/lib/ai/coach').mealIdeas>>) : null;
}
