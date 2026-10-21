import { useMemo, useState } from 'react';
import { Sheet, Stepper } from '@forge/ui';
import { DAYS, shiftWeek } from '../plan';

const describe = (d) => (d.rest ? 'Rest day' : d.items.length === 0 ? 'Empty' : `${d.label || 'Workout'} · ${d.items.length}`);

/** Move the whole week by N days (negative = earlier). Days wrap around, so nothing is lost. */
export default function ShiftWeekSheet({ plan, onApply, onClose }) {
  const [n, setN] = useState(1);
  const next = useMemo(() => shiftWeek(plan, n), [plan, n]);
  return (
    <Sheet title="Shift the whole week" onClose={onClose}>
      <p className="muted">Move every day later (+) or earlier (−). The days at the end wrap to the start, so nothing is lost.</p>
      <div className="shift-row">
        <Stepper label="Days to shift" value={n} min={-6} max={6} onChange={setN} />
        <span className="muted">{n > 0 ? `${n} day${n === 1 ? '' : 's'} later` : n < 0 ? `${-n} day${n === -1 ? '' : 's'} earlier` : 'No change'}</span>
      </div>
      <div className="shift-preview" role="table" aria-label="Preview">
        <div className="shift-line head" role="row"><span role="columnheader">Day</span><span role="columnheader">Now</span><span role="columnheader">After</span></div>
        {DAYS.map((d) => (
          <div className="shift-line" role="row" key={d.key}><span role="cell">{d.name}</span><span role="cell">{describe(plan[d.key])}</span><b role="cell">{describe(next[d.key])}</b></div>
        ))}
      </div>
      <button type="button" className="btn primary big-btn" disabled={n === 0} onClick={() => onApply(n)}>Shift week</button>
    </Sheet>
  );
}
