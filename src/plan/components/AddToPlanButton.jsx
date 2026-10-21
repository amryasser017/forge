import { useState } from 'react';
import { CalendarPlus, Check } from 'lucide-react';
import { Modal } from '@forge/ui';
import { DAYS, hasItem } from '../plan';
import { libView, customView } from '../../library/exerciseViews';
import { usePlanActions } from '../usePlanActions';

/** "Add to plan": choose a day. Already-added days show a check. `doc` = exercise doc or null, `libEx` = dataset entry. */
export default function AddToPlanButton({ doc, libEx }) {
  const { plan, addExercise } = usePlanActions();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const v = libEx ? libView(libEx, doc) : doc ? customView(doc) : null;
  if (!v) return null;
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setOpen(true)}><CalendarPlus size={16} /> Add to plan</button>
      {open && (
        <Modal title="Add to which day?" onClose={() => setOpen(false)}>
          <ul className="template-list">
            {DAYS.map((d) => {
              const added = hasItem(plan[d.key], v.docId);
              return (
                <li key={d.key}>
                  <button type="button" className="template row" disabled={added || !!busy} onClick={async () => { setBusy(d.key); try { await addExercise(d.key, v, 3, 10); } finally { setBusy(null); } }}>
                    <b>{d.name}</b>
                    <small className="muted">{plan[d.key].rest ? 'Rest day' : plan[d.key].label || `${plan[d.key].items.length} exercises`}</small>
                    {added ? <Check size={18} className="up" aria-label="Already in this day" /> : busy === d.key ? <small>Adding…</small> : <small className="muted">3 × 10</small>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="muted">Adds 3 sets × 10 reps. You can change the targets on the Plan page.</p>
        </Modal>
      )}
    </>
  );
}
