'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { askCoachAction, generateSummaryAction } from '@/app/actions/coach';
import { acceptSuggestionAction, suggestChallengesAction } from '@/app/actions/team';
import { useFeedback } from '@/components/ui/feedback';
import { CHALLENGE_METRICS, type ChallengeDraft, type ChallengeMetric } from '@/lib/domain/challenges';
import type { ActionResult } from '@/lib/types';

export function AskCoach({ aiReady }: { aiReady: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<{ q: string; a: string }[]>([]);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r: ActionResult = await askCoachAction(null, fd);
      if (r.ok) {
        const d = r.data as { answer: string; question: string };
        setLog((l) => [{ q: d.question, a: d.answer }, ...l]);
        setError(null);
        ref.current?.reset();
      } else setError(r.error ?? 'The coach could not answer right now.');
    });
  }
  return (
    <div>
      <form ref={ref} onSubmit={onSubmit} className="flex gap-2">
        <input name="question" required minLength={3} maxLength={500} placeholder="e.g. Which exercises improved most this month?" aria-label="Ask the coach" disabled={!aiReady} dir="auto" />
        <button className="btn btn-primary shrink-0" disabled={pending || !aiReady}><Send size={16} /> {pending ? 'Thinking…' : 'Ask'}</button>
      </form>
      {!aiReady && <p className="mt-2 text-sm muted">Questions need the AI key (<code>ANTHROPIC_API_KEY</code>) configured on the server. The data summary above works without it.</p>}
      {error && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      <ul className="mt-3 space-y-3">
        {log.map((x, i) => (
          <li key={i} className="space-y-1">
            <p className="text-sm font-bold" dir="auto">{x.q}</p>
            <p className="whitespace-pre-wrap rounded-xl bg-brand-sky/20 p-3 text-sm" dir="auto"><Bot size={14} className="mr-1 inline" />{x.a}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs muted">Coaching information, not medical advice. The coach only sees your logged data.</p>
    </div>
  );
}

export function GenerateSummary({ aiReady }: { aiReady: boolean }) {
  const { handle } = useFeedback();
  const [pending, start] = useTransition();
  return <button disabled={pending} onClick={() => start(async () => handle(await generateSummaryAction()))} className="btn btn-sky" title={aiReady ? '' : 'Needs ANTHROPIC_API_KEY'}><Sparkles size={16} /> {pending ? 'Writing…' : 'Write an AI summary'}</button>;
}

export function ChallengeSuggestions() {
  const { handle, toast } = useFeedback();
  const [drafts, setDrafts] = useState<ChallengeDraft[] | null>(null);
  const [source, setSource] = useState<'ai' | 'rules'>('rules');
  const [pending, start] = useTransition();
  return (
    <div>
      <button className="btn btn-green" disabled={pending} onClick={() => start(async () => { const r = await suggestChallengesAction(); if (r.error) toast(r.error, 'error'); else { setDrafts(r.drafts); setSource(r.source); } })}><Sparkles size={16} /> {pending ? 'Thinking…' : 'Suggest challenges for me'}</button>
      {drafts && (
        <ul className="mt-3 space-y-2">
          {drafts.length === 0 && <li className="text-sm muted">No suggestions right now.</li>}
          {drafts.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-black/[.03] p-3 dark:bg-white/5">
              <div dir="auto"><div className="font-extrabold">{d.title}</div><div className="text-xs muted">{d.description || `${d.target} ${CHALLENGE_METRICS[d.metric as ChallengeMetric].unit}`}</div></div>
              <button className="btn btn-primary shrink-0" onClick={() => start(async () => { const r = await acceptSuggestionAction({ title: d.title, description: d.description, metric: d.metric, target: d.target, startsOn: d.startsOn, endsOn: d.endsOn }); handle(r); if (r.ok) setDrafts((x) => x && x.filter((_, n) => n !== i)); })}>Accept</button>
            </li>
          ))}
          <li className="text-xs muted">{source === 'ai' ? 'Suggested by the AI from your recent data, validated against safe limits.' : 'Based on your recent weekly average (no AI needed).'}</li>
        </ul>
      )}
    </div>
  );
}
