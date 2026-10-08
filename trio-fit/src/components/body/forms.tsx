'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { deleteMeasurementAction, deletePhotoAction, saveGoalsAction, saveMeasurementAction, setPhotoVisibilityAction, uploadPhotoAction } from '@/app/actions/body';
import { ActionForm, Field, Submit } from '@/components/ui/action-form';
import { useFeedback } from '@/components/ui/feedback';
import { fmtDay } from '@/lib/domain/time';
import type { Goals, Measurement } from '@/lib/types';

const num = (name: string, label: string, props: Record<string, unknown> = {}, def?: number | null) => (
  <Field label={label} name={name}><input name={name} type="number" step="any" inputMode="decimal" defaultValue={def ?? ''} {...props} /></Field>
);

export function MeasurementForm({ today, existing, onDone }: { today: string; existing?: Measurement; onDone?: () => void }) {
  const [more, setMore] = useState(false);
  return (
    <ActionForm action={async (p, fd) => { const r = await saveMeasurementAction(p, fd); if (r.ok) onDone?.(); return r; }} resetOnSuccess={!existing} className="space-y-3">
      {existing && <input type="hidden" name="id" value={existing.id} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Date" name="measuredOn"><input name="measuredOn" type="date" max={today} defaultValue={existing?.measured_on ?? today} required /></Field>
        {num('weightKg', 'Weight (kg)', { min: 20, max: 400 }, existing?.weight_kg)}
        {num('bodyFatPct', 'Body fat (%)', { min: 2, max: 70 }, existing?.body_fat_pct)}
        {num('heightCm', 'Height (cm)', { min: 100, max: 250 }, existing?.height_cm)}
      </div>
      <button type="button" onClick={() => setMore((m) => !m)} className="flex min-h-[44px] items-center gap-1 text-sm font-bold text-brand-orange" aria-expanded={more}><ChevronDown size={16} className={more ? 'rotate-180' : ''} /> Body measurements &amp; scan report</button>
      {more && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {num('waistCm', 'Waist (cm)', {}, existing?.waist_cm)}
            {num('chestCm', 'Chest (cm)', {}, existing?.chest_cm)}
            {num('armCm', 'Arm (cm)', {}, existing?.arm_cm)}
            {num('thighCm', 'Thigh (cm)', {}, existing?.thigh_cm)}
          </div>
          <p className="text-xs muted">From a body-composition scan (e.g. InBody). Home-scale and gym-scan readings are estimates, not medical measurements.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {num('skeletalMuscleKg', 'Skeletal muscle (kg)', {}, existing?.skeletal_muscle_kg)}
            {num('bodyWaterKg', 'Body water (kg)', {}, existing?.body_water_kg)}
            {num('visceralLevel', 'Visceral fat level', {}, existing?.visceral_level)}
            {num('bmrKcal', 'BMR (kcal)', {}, existing?.bmr_kcal)}
          </div>
        </div>
      )}
      <Field label="Note (private)" name="note"><input name="note" maxLength={500} defaultValue={existing?.note ?? ''} /></Field>
      <div className="flex gap-2"><Submit>{existing ? 'Update measurement' : 'Save measurement'}</Submit>{existing && <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>}</div>
    </ActionForm>
  );
}

export function MeasurementHistory({ rows, today }: { rows: Measurement[]; today: string }) {
  const [editing, setEditing] = useState<string | null>(null);
  const { handle } = useFeedback();
  const [pending, start] = useTransition();
  return (
    <ul className="divide-y divide-[var(--line)]">
      {rows.map((r) => (
        <li key={r.id} className="py-3">
          {editing === r.id ? <MeasurementForm today={today} existing={r} onDone={() => setEditing(null)} /> : (
            <div className="flex items-center gap-2">
              <div className="flex-1 text-sm">
                <div className="font-extrabold">{fmtDay(r.measured_on, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div className="muted">{[r.weight_kg != null && `${r.weight_kg} kg`, r.body_fat_pct != null && `${r.body_fat_pct}% fat`, r.waist_cm != null && `waist ${r.waist_cm}`, r.chest_cm != null && `chest ${r.chest_cm}`, r.arm_cm != null && `arm ${r.arm_cm}`, r.thigh_cm != null && `thigh ${r.thigh_cm}`, r.skeletal_muscle_kg != null && `muscle ${r.skeletal_muscle_kg} kg`].filter(Boolean).join(' · ')}</div>
              </div>
              <button className="grid h-11 w-10 place-items-center rounded-lg hover:bg-black/5" aria-label="Edit measurement" onClick={() => setEditing(r.id)}><Pencil size={16} /></button>
              <button disabled={pending} className="grid h-11 w-10 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label="Delete measurement" onClick={() => { if (window.confirm('Delete this measurement?')) start(async () => handle(await deleteMeasurementAction(r.id))); }}><Trash2 size={16} /></button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function GoalsForm({ goals }: { goals: Goals }) {
  return (
    <ActionForm action={saveGoalsAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {num('heightCm', 'Height (cm)', {}, goals.height_cm)}
        {num('startWeightKg', 'Starting weight (kg)', {}, goals.start_weight_kg)}
        {num('targetWeightKg', 'Target weight (kg)', {}, goals.target_weight_kg)}
        {num('targetBodyFatPct', 'Target body fat (%)', {}, goals.target_body_fat_pct)}
        {num('calorieTarget', 'Calories / day', {}, goals.calorie_target)}
        {num('proteinTargetG', 'Protein (g)', {}, goals.protein_target_g)}
        {num('carbsTargetG', 'Carbs (g)', {}, goals.carbs_target_g)}
        {num('fatTargetG', 'Fat (g)', {}, goals.fat_target_g)}
        {num('waterTargetMl', 'Water (ml / day)', {}, goals.water_target_ml)}
      </div>
      <p className="text-xs muted">Targets are yours to choose. This app never assigns medical targets from BMI or a single scan.</p>
      <Submit>Save goals</Submit>
    </ActionForm>
  );
}

export function PhotoUpload({ today }: { today: string }) {
  return (
    <ActionForm action={uploadPhotoAction} resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
      <Field label="Progress photo (private by default)" name="photo"><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="!min-h-0 !p-2" /></Field>
      <Field label="Taken on" name="takenOn"><input name="takenOn" type="date" max={today} defaultValue={today} required /></Field>
      <Submit pendingText="Uploading…">Upload</Submit>
    </ActionForm>
  );
}

export function PhotoCard({ id, url, takenOn, visibility, mine }: { id: string; url: string; takenOn: string; visibility: 'private' | 'shared'; mine: boolean }) {
  const { handle } = useFeedback();
  const [pending, start] = useTransition();
  return (
    <figure className="overflow-hidden rounded-xl border border-[var(--line)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`Progress photo from ${takenOn}`} className="aspect-[3/4] w-full object-cover" loading="lazy" />
      <figcaption className="space-y-1 p-2 text-xs">
        <div className="flex items-center justify-between font-bold"><span>{fmtDay(takenOn, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span className={`chip ${visibility === 'shared' ? 'bg-brand-green/40' : 'bg-black/5 dark:bg-white/10'}`}>{visibility}</span></div>
        {mine && (
          <div className="flex gap-1">
            <button disabled={pending} className="btn btn-ghost !min-h-[36px] flex-1 !px-2 !py-1 text-xs" onClick={() => start(async () => handle(await setPhotoVisibilityAction(id, visibility === 'shared' ? 'private' : 'shared')))}>{visibility === 'shared' ? 'Make private' : 'Share with crew'}</button>
            <button disabled={pending} className="btn btn-danger !min-h-[36px] !px-2 !py-1" aria-label="Delete photo" onClick={() => { if (window.confirm('Delete this photo?')) start(async () => handle(await deletePhotoAction(id))); }}><Trash2 size={14} /></button>
          </div>
        )}
      </figcaption>
    </figure>
  );
}
