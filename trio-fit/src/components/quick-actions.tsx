'use client';

import { useState, useTransition } from 'react';
import { Droplets, Undo2 } from 'lucide-react';
import { addWaterAction, undoWaterAction } from '@/app/actions/kitchen';
import { useFeedback } from '@/components/ui/feedback';
import { ProgressBar } from '@/components/ui/bits';

export function WaterTracker({ day, consumed, goal }: { day: string; consumed: number; goal: number }) {
  const { handle } = useFeedback();
  const [pending, start] = useTransition();
  const [custom, setCustom] = useState('');
  const pct = (consumed / goal) * 100;
  const add = (ml: number) => start(async () => handle(await addWaterAction(day, ml)));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-2 font-extrabold"><Droplets size={18} className="text-sky-500" /> {consumed.toLocaleString()} <span className="text-sm font-semibold muted">/ {goal.toLocaleString()} ml</span></span>
        <span className="text-xs font-bold muted">{Math.round(pct)}%</span>
      </div>
      <div className="mt-2"><ProgressBar value={pct} color="bg-brand-sky" label="Water progress" /></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[250, 500, 750].map((ml) => (
          <button key={ml} disabled={pending} onClick={() => add(ml)} className="btn btn-sky">+{ml} ml</button>
        ))}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = Number(custom); if (n >= 50 && n <= 5000) { add(n); setCustom(''); } }}>
          <input value={custom} onChange={(e) => setCustom(e.target.value)} inputMode="numeric" placeholder="ml" aria-label="Custom amount in ml" className="!w-20" />
          <button className="btn btn-ghost" disabled={pending}>Add</button>
        </form>
        <button disabled={pending || consumed === 0} onClick={() => start(async () => handle(await undoWaterAction(day)))} className="btn btn-ghost" aria-label="Undo last water entry"><Undo2 size={16} /></button>
      </div>
    </div>
  );
}
