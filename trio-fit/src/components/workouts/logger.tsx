'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Search, Trash2, X } from 'lucide-react';
import { lastExerciseAction, saveWorkoutAction, type LastExercise } from '@/app/actions/workouts';
import { useFeedback } from '@/components/ui/feedback';
import { RestTimer } from './rest-timer';
import { fmtDay } from '@/lib/domain/time';

export interface LibExercise {
  id: string;
  slug: string;
  name: string;
  kind: 'resistance' | 'cardio';
  categories: string[];
  equipment: string | null;
}
interface SetState { weightKg: string; reps: string; restSec: string }
interface ExState {
  key: string;
  exerciseId: string;
  sets: SetState[];
  durationMin: string;
  distanceKm: string;
  avgSpeedKmh: string;
  inclinePct: string;
  notes: string;
  last?: LastExercise | null;
}
export interface InitialWorkout {
  id?: string;
  performedOn: string;
  title: string;
  durationMin?: number;
  perceivedEffort?: number;
  notes?: string;
  exercises: { exerciseId: string; notes?: string; durationMin?: number; distanceKm?: number; avgSpeedKmh?: number; inclinePct?: number; sets: { weightKg?: number; reps?: number; restSec?: number }[] }[];
}

const CATS = [
  ['all', 'All'], ['upper-body', 'Upper'], ['lower-body', 'Lower'], ['push', 'Push'], ['pull', 'Pull'], ['legs', 'Legs'], ['core', 'Core'], ['cardio', 'Cardio'], ['free-weights', 'Free weights'],
] as const;

let uid = 0;
const newKey = () => `ex${++uid}-${Date.now()}`;
const emptySet = (): SetState => ({ weightKg: '', reps: '', restSec: '' });
const s2 = (n: number | null | undefined) => (n == null ? '' : String(n));

function fromInitial(init: InitialWorkout): ExState[] {
  return init.exercises.map((e) => ({
    key: newKey(),
    exerciseId: e.exerciseId,
    sets: e.sets.length ? e.sets.map((x) => ({ weightKg: s2(x.weightKg), reps: s2(x.reps), restSec: s2(x.restSec) })) : [emptySet()],
    durationMin: s2(e.durationMin), distanceKm: s2(e.distanceKm), avgSpeedKmh: s2(e.avgSpeedKmh), inclinePct: s2(e.inclinePct), notes: e.notes ?? '',
  }));
}

export function WorkoutLogger({ library, initial, preselect }: { library: LibExercise[]; initial: InitialWorkout; preselect?: string }) {
  const { handle, toast } = useFeedback();
  const [pending, start] = useTransition();
  const byId = useMemo(() => Object.fromEntries(library.map((e) => [e.id, e])), [library]);
  const draftKey = initial.id ? null : 'trio-fit-draft';
  const [title, setTitle] = useState(initial.title);
  const [performedOn, setPerformedOn] = useState(initial.performedOn);
  const [durationMin, setDurationMin] = useState(s2(initial.durationMin));
  const [effort, setEffort] = useState(s2(initial.perceivedEffort));
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [items, setItems] = useState<ExState[]>(() => fromInitial(initial));
  const [picker, setPicker] = useState(false);
  const restored = useRef(false);

  // Restore an unsaved draft (phone locked mid-workout, accidental refresh…)
  useEffect(() => {
    if (!draftKey || restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw && initial.exercises.length === 0) {
        const d = JSON.parse(raw) as { title: string; items: ExState[]; notes: string };
        if (d.items?.length) { setTitle(d.title || initial.title); setItems(d.items); setNotes(d.notes ?? ''); toast('Restored your unsaved workout'); }
      }
    } catch { /* ignore */ }
    if (preselect) { const ex = library.find((l) => l.slug === preselect); if (ex) void addExercise(ex); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!draftKey) return;
    try {
      if (items.length) localStorage.setItem(draftKey, JSON.stringify({ title, items, notes }));
      else localStorage.removeItem(draftKey);
    } catch { /* storage unavailable */ }
  }, [items, title, notes, draftKey]);

  async function addExercise(ex: LibExercise) {
    const key = newKey();
    setItems((cur) => [...cur, { key, exerciseId: ex.id, sets: ex.kind === 'cardio' ? [] : [emptySet()], durationMin: '', distanceKm: '', avgSpeedKmh: '', inclinePct: '', notes: '', last: undefined }]);
    setPicker(false);
    const last = await lastExerciseAction(ex.id, performedOn, initial.id);
    setItems((cur) => cur.map((i) => (i.key === key ? { ...i, last } : i)));
  }
  const patch = (key: string, p: Partial<ExState>) => setItems((cur) => cur.map((i) => (i.key === key ? { ...i, ...p } : i)));
  const patchSet = (key: string, idx: number, p: Partial<SetState>) => setItems((cur) => cur.map((i) => (i.key === key ? { ...i, sets: i.sets.map((s, n) => (n === idx ? { ...s, ...p } : s)) } : i)));
  const move = (idx: number, dir: -1 | 1) => setItems((cur) => { const n = [...cur]; const t = idx + dir; if (t < 0 || t >= n.length) return cur; [n[idx], n[t]] = [n[t] as ExState, n[idx] as ExState]; return n; });
  function copyLast(it: ExState) {
    if (!it.last) return;
    patch(it.key, { sets: it.last.sets.length ? it.last.sets.map((x) => ({ weightKg: s2(x.weightKg), reps: s2(x.reps), restSec: '' })) : it.sets, durationMin: s2(it.last.durationMin), distanceKm: s2(it.last.distanceKm) });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { id: initial.id, performedOn, title, durationMin, perceivedEffort: effort, notes, exercises: items.map((i) => ({ exerciseId: i.exerciseId, notes: i.notes, durationMin: i.durationMin, distanceKm: i.distanceKm, avgSpeedKmh: i.avgSpeedKmh, inclinePct: i.inclinePct, sets: i.sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps, restSec: s.restSec })) })) };
    start(async () => {
      const r = await saveWorkoutAction(payload);
      if (r.ok && draftKey) try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      handle(r);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="card grid gap-3 sm:grid-cols-4">
        <label className="sm:col-span-2"><span className="label">Workout title</span><input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} placeholder="e.g. Leg day" /></label>
        <label><span className="label">Date</span><input type="date" value={performedOn} onChange={(e) => setPerformedOn(e.target.value)} required /></label>
        <label><span className="label">Duration (min)</span><input type="number" inputMode="numeric" min={1} max={600} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} /></label>
      </div>

      {items.length === 0 && <div className="card text-center text-sm muted">No exercises yet. Add the first machine or lift to start logging sets.</div>}

      {items.map((it, idx) => {
        const ex = byId[it.exerciseId];
        if (!ex) return null;
        const cardio = ex.kind === 'cardio';
        return (
          <section key={it.key} className="card space-y-3" aria-label={ex.name}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg">{ex.name}</h3>
                <p className="text-xs muted">{ex.equipment}</p>
              </div>
              <div className="flex">
                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="grid h-11 w-11 place-items-center rounded-lg hover:bg-black/5 disabled:opacity-30" aria-label="Move up"><ArrowUp size={18} /></button>
                <button type="button" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="grid h-11 w-11 place-items-center rounded-lg hover:bg-black/5 disabled:opacity-30" aria-label="Move down"><ArrowDown size={18} /></button>
                <button type="button" onClick={() => setItems((c) => c.filter((x) => x.key !== it.key))} className="grid h-11 w-11 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`Remove ${ex.name}`}><Trash2 size={18} /></button>
              </div>
            </div>

            {it.last === undefined ? <p className="text-xs muted">Looking up your last session…</p> : it.last ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-sky/20 px-3 py-2 text-sm">
                <span><b>Last time</b> ({fmtDay(it.last.performedOn)}): {cardio ? `${it.last.durationMin ?? '–'} min · ${it.last.distanceKm ?? '–'} km` : it.last.sets.filter((x) => x.weightKg || x.reps).map((x) => `${x.weightKg ?? '–'}×${x.reps ?? '–'}`).join(', ') || 'no sets'}</span>
                <button type="button" onClick={() => copyLast(it)} className="btn btn-ghost !min-h-[36px] !py-1"><Copy size={14} /> Copy last workout</button>
              </div>
            ) : <p className="text-xs muted">First time logging this exercise: it becomes your baseline.</p>}

            {cardio ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label><span className="label">Minutes</span><input type="number" inputMode="decimal" step="0.5" min={0} value={it.durationMin} onChange={(e) => patch(it.key, { durationMin: e.target.value })} /></label>
                <label><span className="label">Distance (km)</span><input type="number" inputMode="decimal" step="0.01" min={0} value={it.distanceKm} onChange={(e) => patch(it.key, { distanceKm: e.target.value })} /></label>
                <label><span className="label">Avg speed (km/h)</span><input type="number" inputMode="decimal" step="0.1" min={0} value={it.avgSpeedKmh} onChange={(e) => patch(it.key, { avgSpeedKmh: e.target.value })} /></label>
                <label><span className="label">Incline (%)</span><input type="number" inputMode="decimal" step="0.5" min={0} value={it.inclinePct} onChange={(e) => patch(it.key, { inclinePct: e.target.value })} /></label>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.75rem] items-center gap-2 px-1 text-xs font-bold uppercase muted"><span>Set</span><span>Weight (kg)</span><span>Reps</span><span>Rest (s)</span><span /></div>
                <div className="space-y-2">
                  {it.sets.map((s, n) => (
                    <div key={n} className="grid grid-cols-[2rem_1fr_1fr_1fr_2.75rem] items-center gap-2">
                      <span className="text-center font-extrabold">{n + 1}</span>
                      <input aria-label={`Set ${n + 1} weight`} type="number" inputMode="decimal" step="0.5" min={0} value={s.weightKg} onChange={(e) => patchSet(it.key, n, { weightKg: e.target.value })} />
                      <input aria-label={`Set ${n + 1} reps`} type="number" inputMode="numeric" min={0} value={s.reps} onChange={(e) => patchSet(it.key, n, { reps: e.target.value })} />
                      <input aria-label={`Set ${n + 1} rest seconds`} type="number" inputMode="numeric" min={0} value={s.restSec} onChange={(e) => patchSet(it.key, n, { restSec: e.target.value })} />
                      <button type="button" onClick={() => patch(it.key, { sets: it.sets.filter((_, i) => i !== n) })} className="grid h-11 w-11 place-items-center rounded-lg text-[var(--muted)] hover:bg-black/5" aria-label={`Remove set ${n + 1}`}><X size={16} /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => patch(it.key, { sets: [...it.sets, { ...(it.sets[it.sets.length - 1] ?? emptySet()), restSec: '' }] })} className="btn btn-ghost mt-2"><Plus size={16} /> Add set</button>
              </div>
            )}
            <input value={it.notes} onChange={(e) => patch(it.key, { notes: e.target.value })} placeholder="Notes (seat setting, how it felt…)" maxLength={300} aria-label={`${ex.name} notes`} />
          </section>
        );
      })}

      <button type="button" onClick={() => setPicker(true)} className="btn btn-sky w-full"><Plus size={18} /> Add exercise</button>

      <div className="card grid gap-3 sm:grid-cols-[140px_1fr]">
        <label><span className="label">Effort (1–10)</span><input type="number" inputMode="numeric" min={1} max={10} value={effort} onChange={(e) => setEffort(e.target.value)} /></label>
        <label><span className="label">Notes (private)</span><input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="How did the session feel?" /></label>
      </div>

      <button disabled={pending || items.length === 0} className="btn btn-primary w-full !min-h-[52px] text-base">{pending ? 'Saving…' : initial.id ? 'Save changes' : 'Finish workout'}</button>
      <RestTimer />
      {picker && <Picker library={library} onPick={addExercise} onClose={() => setPicker(false)} />}
    </form>
  );
}

function Picker({ library, onPick, onClose }: { library: LibExercise[]; onPick: (e: LibExercise) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const list = library.filter((e) => (cat === 'all' || e.categories.includes(cat)) && e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-brand-navy/60 sm:items-center sm:justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label="Choose exercise">
      <div className="max-h-[85vh] w-full overflow-hidden rounded-t-xl2 bg-[var(--card)] sm:max-w-lg sm:rounded-xl2" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3 border-b border-[var(--line)] p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" className="pl-9" aria-label="Search exercises" /></div>
            <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-lg hover:bg-black/5" aria-label="Close"><X size={18} /></button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATS.map(([k, label]) => <button type="button" key={k} onClick={() => setCat(k)} className={`chip shrink-0 !min-h-[36px] ${cat === k ? 'bg-brand-orange text-white' : 'bg-black/5 dark:bg-white/10'}`}>{label}</button>)}
          </div>
        </div>
        <ul className="max-h-[55vh] divide-y divide-[var(--line)] overflow-y-auto">
          {list.map((e) => (
            <li key={e.id}><button type="button" onClick={() => onPick(e)} className="flex min-h-[52px] w-full items-center justify-between px-4 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"><span className="font-bold">{e.name}</span><span className="text-xs muted">{e.kind === 'cardio' ? 'Cardio' : e.equipment}</span></button></li>
          ))}
          {list.length === 0 && <li className="p-6 text-center text-sm muted">No match. Add a custom exercise from the Arena page.</li>}
        </ul>
      </div>
    </div>
  );
}
