import { useEffect, useRef, useState } from 'react';
import { Timer, Trophy } from 'lucide-react';
import { useApp, useCol } from '../../AppContext';
import Stepper from '../Stepper';
import { ensureLibExercise } from '../../lib/exerciseData';
import { bestWeight, lastLog, setsOn } from '../../lib/exerciseStats';
import { getDraft, setDraft } from '../../lib/setDrafts';
import { todayStr } from '../../utils';

const REST_SECONDS = 90;

function RestTimer({ run }) {
  const [left, setLeft] = useState(REST_SECONDS);
  useEffect(() => {
    setLeft(REST_SECONDS);
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [run]);
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, '0');
  return <div className="rest-timer" role="timer" aria-live="off"><Timer size={16} /> {left > 0 ? `Rest ${m}:${s}` : 'Rest over. Next set.'}</div>;
}

/** Quick set logger. Writes to users/{uid}/logs exactly like the detail page: one doc per set. */
export default function LogTab({ ex, libEx, logs, targetSets }) {
  const app = useApp();
  const { add, show, toKg, unit } = app;
  const today = todayStr();
  const last = lastLog(logs);
  const draft = getDraft(ex.id);
  const stepW = unit === 'kg' ? 2.5 : 5;
  const [weight, setWeight] = useState(() => draft?.weight ?? (last ? Number(show(last.weight)) : 0));
  const [reps, setReps] = useState(() => draft?.reps ?? last?.reps ?? 8);
  const [pr, setPr] = useState(false);
  const [rest, setRest] = useState(0);
  const [useTimer, setUseTimer] = useState(() => { try { return localStorage.getItem('forge.restTimer') === '1'; } catch { return false; } });
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const edit = (w, r) => { setWeight(w); setReps(r); setDraft(ex.id, { weight: w, reps: r }); };
  const done = setsOn(logs, today);

  async function log() {
    const kg = toKg(weight);
    if (kg == null || kg < 0 || busy) return;
    setBusy(true);
    try {
      const wasPR = logs.length > 0 && kg > bestWeight(logs);
      if (ex.virtual && libEx) await ensureLibExercise(app, libEx);
      await add('logs', { exerciseId: ex.id, exerciseName: ex.name, weight: kg, reps: parseInt(reps, 10) || 1, sets: 1, date: today });
      setDraft(ex.id, null);
      if (!alive.current) return;
      setPr(wasPR);
      if (wasPR) setTimeout(() => alive.current && setPr(false), 4000);
      if (useTimer) setRest((n) => n + 1);
    } finally { if (alive.current) setBusy(false); }
  }
  const toggleTimer = (on) => {
    setUseTimer(on);
    if (!on) setRest(0);
    try { localStorage.setItem('forge.restTimer', on ? '1' : '0'); } catch { /* ignore */ }
  };

  return (
    <div className="logtab">
      <div className="set-counter" aria-live="polite">
        <b>{done}{targetSets ? <em>/{targetSets}</em> : null}</b>
        <small>{targetSets ? 'sets done today' : done === 1 ? 'set today' : 'sets today'}</small>
      </div>
      {pr && <div className="pr-banner"><Trophy size={22} /> New personal record. That is the work paying off.</div>}
      <div className="log-steppers">
        <div><small className="muted">Weight</small><Stepper label={`Weight (${unit})`} value={weight} onChange={(w) => edit(w, reps)} min={0} max={1000} step={stepW} decimals={1} suffix={unit} /></div>
        <div><small className="muted">Reps</small><Stepper label="Reps" value={reps} onChange={(r) => edit(weight, r)} min={1} max={100} /></div>
      </div>
      <button type="button" className="btn primary big-btn" onClick={log} disabled={busy}>Log set</button>
      <label className="switch">
        <input type="checkbox" checked={useTimer} onChange={(e) => toggleTimer(e.target.checked)} />
        <span>Rest timer ({REST_SECONDS}s)</span>
      </label>
      {useTimer && rest > 0 && <RestTimer run={rest} />}
    </div>
  );
}
