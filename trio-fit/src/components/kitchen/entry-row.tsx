'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteFoodAction, saveFoodAction } from '@/app/actions/kitchen';
import { ActionForm, Field, Submit } from '@/components/ui/action-form';
import { useFeedback } from '@/components/ui/feedback';
import type { FoodLog } from '@/lib/types';

export function EntryRow({ f }: { f: FoodLog }) {
  const [edit, setEdit] = useState(false);
  const { handle } = useFeedback();
  const [pending, start] = useTransition();
  if (edit) {
    return (
      <li className="py-3">
        <ActionForm action={async (p, fd) => { const r = await saveFoodAction(p, fd); if (r.ok) setEdit(false); return r; }} className="space-y-2">
          <input type="hidden" name="id" value={f.id} /><input type="hidden" name="eatenOn" value={f.eaten_on} /><input type="hidden" name="mealType" value={f.meal_type} /><input type="hidden" name="source" value={f.source === 'ai_estimate' ? 'ai_estimate' : 'manual'} />
          <Field label="Food" name="name"><input name="name" defaultValue={f.name} required maxLength={120} /></Field>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Field label="Amount" name="quantity"><input name="quantity" type="number" step="any" defaultValue={f.quantity} required /></Field>
            <Field label="Unit" name="unit"><input name="unit" defaultValue={f.unit} maxLength={20} /></Field>
            <Field label="kcal" name="calories"><input name="calories" type="number" step="any" defaultValue={f.calories} required /></Field>
            <Field label="Protein" name="proteinG"><input name="proteinG" type="number" step="any" defaultValue={f.protein_g} /></Field>
            <Field label="Carbs" name="carbsG"><input name="carbsG" type="number" step="any" defaultValue={f.carbs_g} /></Field>
            <Field label="Fat" name="fatG"><input name="fatG" type="number" step="any" defaultValue={f.fat_g} /></Field>
          </div>
          <div className="flex gap-2"><Submit>Save</Submit><button type="button" className="btn btn-ghost" onClick={() => setEdit(false)}>Cancel</button></div>
        </ActionForm>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">{f.name}</div>
        <div className="text-xs muted">{f.quantity} {f.unit} · P {Math.round(f.protein_g)} · C {Math.round(f.carbs_g)} · F {Math.round(f.fat_g)}{f.source === 'ai_estimate' && <span className="ml-1 chip bg-brand-orange/20 !py-0">AI estimate</span>}</div>
      </div>
      <div className="text-right font-extrabold">{Math.round(f.calories)}<span className="text-xs font-semibold muted"> kcal</span></div>
      <button className="grid h-11 w-10 place-items-center rounded-lg hover:bg-black/5" aria-label={`Edit ${f.name}`} onClick={() => setEdit(true)}><Pencil size={16} /></button>
      <button disabled={pending} className="grid h-11 w-10 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`Delete ${f.name}`} onClick={() => { if (window.confirm(`Delete ${f.name}?`)) start(async () => handle(await deleteFoodAction(f.id))); }}><Trash2 size={16} /></button>
    </li>
  );
}
