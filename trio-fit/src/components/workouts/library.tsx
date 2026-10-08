'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { createExerciseAction } from '@/app/actions/workouts';
import { ActionForm, Field, Submit } from '@/components/ui/action-form';
import type { LibExercise } from './logger';

const CATS = [['all', 'All'], ['upper-body', 'Upper Body'], ['lower-body', 'Lower Body'], ['push', 'Push'], ['pull', 'Pull'], ['legs', 'Legs'], ['core', 'Core'], ['cardio', 'Cardio'], ['free-weights', 'Free Weights']] as const;

export function ExerciseLibrary({ library, mine }: { library: (LibExercise & { muscles: string[]; hasVideo: boolean; custom: boolean })[]; mine: Record<string, number> }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [adding, setAdding] = useState(false);
  const list = library.filter((e) => (cat === 'all' || e.categories.includes(cat)) && `${e.name} ${e.muscles.join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search machines, lifts or muscles" className="pl-9" aria-label="Search exercises" /></div>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {CATS.map(([k, label]) => <button key={k} onClick={() => setCat(k)} className={`chip shrink-0 !min-h-[40px] !px-3 ${cat === k ? 'bg-brand-orange text-white' : 'bg-black/5 dark:bg-white/10'}`} aria-pressed={cat === k}>{label}</button>)}
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((e) => (
          <li key={e.id}>
            <Link href={`/exercises/${e.slug}`} className="card block h-full transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-2"><h3 className="text-base">{e.name}</h3>{e.custom && <span className="chip bg-brand-sky/30">Custom</span>}</div>
              <p className="mt-1 text-xs muted">{e.kind === 'cardio' ? 'Cardio' : e.equipment} · {e.muscles.slice(0, 2).join(', ')}</p>
              <div className="mt-2 flex gap-2 text-xs font-bold">
                {mine[e.id] ? <span className="chip bg-brand-green/30">{mine[e.id]} session{mine[e.id] === 1 ? '' : 's'}</span> : <span className="chip bg-black/5 dark:bg-white/10">Not tried yet</span>}
                {e.hasVideo && <span className="chip bg-brand-orange/15 text-brand-orange">Video</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="mt-6 text-center text-sm muted">Nothing matches. Try another word or add a custom exercise.</p>}
      <div className="mt-5">
        {adding ? (
          <ActionForm action={createExerciseAction} resetOnSuccess className="card space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Exercise name" name="name"><input name="name" required maxLength={60} /></Field>
              <Field label="Type" name="kind"><select name="kind" defaultValue="resistance"><option value="resistance">Weights / machine</option><option value="cardio">Cardio</option></select></Field>
              <Field label="Equipment (optional)" name="equipment"><input name="equipment" maxLength={60} /></Field>
              <Field label="Muscles (comma separated)" name="muscles"><input name="muscles" maxLength={120} /></Field>
            </div>
            <div className="flex gap-2"><Submit>Add to library</Submit><button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Close</button></div>
          </ActionForm>
        ) : <button onClick={() => setAdding(true)} className="btn btn-ghost"><Plus size={16} /> Add custom exercise</button>}
      </div>
    </div>
  );
}
