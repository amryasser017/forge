import { useState } from 'react';
import { useDataStore } from '@forge/datastore';
import { ensureLibExercise } from '../../library/exerciseData';
import { DEFAULT_REPS, DEFAULT_SETS, addItem, dayKeyOf, hasItem } from '../plan';
import { usePlanActions } from '../usePlanActions';

/** One tap: put an exercise into today's plan (turning the rest flag off). `ex` = exercise doc (or virtual doc), `libEx` = dataset entry. */
export default function AddToTodayButton({ ex, libEx, defaultReps }) {
  const store = useDataStore();
  const { plan, update } = usePlanActions();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const todayKey = dayKeyOf();
  const inToday = hasItem(plan[todayKey], ex.id);

  async function add() {
    if (busy) return;
    setBusy(true);
    try {
      if (ex.virtual && libEx) await ensureLibExercise(store, libEx);
      await update(todayKey, (d) => addItem({ ...d, rest: false }, ex.id, DEFAULT_SETS, defaultReps ?? DEFAULT_REPS));
      setAdded(true);
    } finally { setBusy(false); }
  }

  if (inToday) return added ? <p className="muted" role="status">Added to today's plan.</p> : null;
  return (
    <button type="button" className="btn ghost" onClick={add} disabled={busy}>
      {plan[todayKey].rest ? "Add to today's plan (turns rest day off)" : "Add to today's plan"}
    </button>
  );
}
