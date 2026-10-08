'use client';

import { useState, useTransition } from 'react';
import { Plus, Swords, Wand2 } from 'lucide-react';
import { createChallengeAction, createWeeklyDefaultsAction } from '@/app/actions/team';
import { ActionForm, Field, Submit } from '@/components/ui/action-form';
import { useFeedback } from '@/components/ui/feedback';
import { CHALLENGE_METRICS, METRIC_KEYS } from '@/lib/domain/challenges';
import { addDays } from '@/lib/domain/time';

export function WeeklyDefaults() {
  const { handle } = useFeedback();
  const [pending, start] = useTransition();
  return <button className="btn btn-green" disabled={pending} onClick={() => start(async () => handle(await createWeeklyDefaultsAction()))}><Wand2 size={16} /> Create this week&apos;s challenges</button>;
}

export function ChallengeCreator({ today, others }: { today: string; others: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<'individual' | 'team' | 'battle'>('individual');
  if (!open) return <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New challenge</button>;
  return (
    <ActionForm action={async (p, fd) => { const r = await createChallengeAction(p, fd); if (r.ok) setOpen(false); return r; }} className="card space-y-3 border-brand-orange/40">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type" name="scope"><select name="scope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}><option value="individual">Just me</option><option value="team">Team (all three)</option><option value="battle">Battle vs a friend</option></select></Field>
        {scope === 'battle' && <Field label="Opponent" name="opponentId"><select name="opponentId" required>{others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>}
        <Field label="Title" name="title" className="sm:col-span-2"><input name="title" required minLength={3} maxLength={80} placeholder="e.g. Show-up week" /></Field>
        <Field label="What counts" name="metric"><select name="metric" defaultValue="workout_sessions">{METRIC_KEYS.map((k) => <option key={k} value={k}>{CHALLENGE_METRICS[k].label}</option>)}</select></Field>
        <Field label="Target" name="target" hint="Capped to keep challenges safe and realistic"><input name="target" type="number" min={1} max={40} inputMode="numeric" defaultValue={4} required /></Field>
        <Field label="Starts" name="startsOn"><input name="startsOn" type="date" defaultValue={today} required /></Field>
        <Field label="Ends" name="endsOn"><input name="endsOn" type="date" defaultValue={addDays(today, 6)} required /></Field>
        <Field label="XP reward (optional)" name="xpReward"><input name="xpReward" type="number" min={0} max={500} inputMode="numeric" placeholder="default" /></Field>
        {scope === 'team' && <label className="flex min-h-[44px] items-center gap-2 text-sm font-bold sm:self-end"><input type="checkbox" name="isBoss" /> 👹 Make it a Boss Battle</label>}
      </div>
      <p className="text-xs muted">Challenges only count safe habits (sessions, logging, hydration targets, check-ins, records). Nothing rewards heavier lifting or weight loss.</p>
      <div className="flex gap-2"><Submit>{scope === 'battle' ? <span className="flex items-center gap-2"><Swords size={16} /> Start battle</span> : 'Create'}</Submit><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button></div>
    </ActionForm>
  );
}
