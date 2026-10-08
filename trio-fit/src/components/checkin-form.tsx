'use client';

import { saveCheckInAction } from '@/app/actions/kitchen';
import { ActionForm, Field, Submit } from '@/components/ui/action-form';
import type { CheckIn } from '@/lib/types';

const LEVELS = [1, 2, 3, 4, 5];

function Scale({ name, label, value }: { name: string; label: string; value: number | null | undefined }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex gap-1.5">
        {LEVELS.map((n) => (
          <label key={n} className="flex-1 cursor-pointer">
            <input type="radio" name={name} value={n} defaultChecked={value === n} className="peer sr-only" />
            <span className="grid h-11 place-items-center rounded-xl border border-[var(--line)] text-sm font-extrabold peer-checked:border-brand-orange peer-checked:bg-brand-orange peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-sky">{n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CheckInForm({ day, existing }: { day: string; existing: CheckIn | null }) {
  return (
    <ActionForm action={saveCheckInAction} className="space-y-3">
      <input type="hidden" name="day" value={day} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Scale name="energy" label="Energy (1 low – 5 high)" value={existing?.energy} />
        <Scale name="stress" label="Stress (1 calm – 5 high)" value={existing?.stress} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <Field label="Sleep (hours)" name="sleepHours"><input name="sleepHours" type="number" step="0.5" min="0" max="16" inputMode="decimal" defaultValue={existing?.sleep_hours ?? ''} /></Field>
        <Field label="Note (private)" name="note"><input name="note" maxLength={500} defaultValue={existing?.note ?? ''} placeholder="How did training feel?" /></Field>
      </div>
      <Submit className="btn btn-green">{existing ? 'Update check-in' : 'Save check-in'}</Submit>
    </ActionForm>
  );
}
