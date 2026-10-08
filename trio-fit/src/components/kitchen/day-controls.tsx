'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Lightbulb, Save } from 'lucide-react';
import { completeFoodDayAction, saveMealAction } from '@/app/actions/kitchen';
import { mealIdeasAction } from '@/app/actions/coach';
import { useFeedback } from '@/components/ui/feedback';

export function CompleteDay({ day, complete, count }: { day: string; complete: boolean; count: number }) {
  const { handle } = useFeedback();
  const [pending, start] = useTransition();
  return (
    <div className={`rounded-xl p-3 ${complete ? 'bg-brand-green/30' : 'bg-black/[.03] dark:bg-white/5'}`}>
      <p className="text-sm font-bold">{complete ? <span className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-600" /> You marked today as fully, honestly logged.</span> : 'Everything you ate today is in here? Mark it complete to earn XP. Days you don\'t mark stay "unknown", never "ate nothing".'}</p>
      <button disabled={pending || (!complete && count < 2)} onClick={() => start(async () => handle(await completeFoodDayAction(day, !complete)))} className={`btn mt-2 ${complete ? 'btn-ghost' : 'btn-green'}`}>{complete ? 'Reopen this day' : count < 2 ? 'Log at least 2 items first' : 'Mark my day complete'}</button>
    </div>
  );
}

export function SaveMeal({ day, meal }: { day: string; meal: string }) {
  const { handle } = useFeedback();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pending, start] = useTransition();
  if (!open) return <button className="text-xs font-bold text-brand-orange" onClick={() => setOpen(true)}><Save size={12} className="mr-1 inline" />Save as meal</button>;
  return (
    <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveMealAction(name, meal, day); handle(r); if (r.ok) { setOpen(false); setName(''); } }); }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name" aria-label="Meal name" maxLength={60} required />
      <button className="btn btn-ghost" disabled={pending}>Save</button>
    </form>
  );
}

type Ideas = NonNullable<Awaited<ReturnType<typeof mealIdeasAction>>>;
export function MealIdeas({ remainingCalories, remainingProtein }: { remainingCalories: number | null; remainingProtein: number | null }) {
  const [ideas, setIdeas] = useState<Ideas | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button className="btn btn-sky" disabled={pending} onClick={() => start(async () => setIdeas(await mealIdeasAction(remainingCalories, remainingProtein)))}><Lightbulb size={16} /> {pending ? 'Thinking…' : 'Meal ideas'}</button>
      {ideas && (
        <ul className="mt-3 space-y-2">
          {ideas.ideas.map((i, n) => (
            <li key={n} className="rounded-xl bg-black/[.03] p-3 dark:bg-white/5" dir="auto">
              <div className="font-extrabold">{i.title}</div>
              <div className="text-xs muted">{i.ingredients.join(' · ')}</div>
              {i.approxCalories != null && <div className="mt-1 text-xs font-bold">≈ {Math.round(i.approxCalories)} kcal{i.approxProteinG != null ? ` · ≈ ${Math.round(i.approxProteinG)} g protein` : ''} <span className="font-normal muted">(rough estimate)</span></div>}
            </li>
          ))}
          <li className="text-xs muted">{ideas.estimated ? 'Numbers are AI estimates, not verified nutrition facts.' : 'Simple ideas with no calorie numbers: log the real portions you eat for accurate totals.'}</li>
        </ul>
      )}
    </div>
  );
}
