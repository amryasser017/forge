import { Sheet } from '@forge/ui';
import { DAYS } from '../plan';

const VERB = { swap: 'Swap', move: 'Move', copy: 'Copy' };
const summary = (d) => (d.rest ? 'Rest day' : d.items.length === 0 ? 'Empty' : `${d.items.length} ${d.items.length === 1 ? 'exercise' : 'exercises'}${d.label ? ` · ${d.label}` : ''}`);

/** Pick the other day for a swap / move / copy of `from`. */
export default function DayPickerSheet({ kind, from, plan, onPick, onClose }) {
  const src = DAYS.find((d) => d.key === from);
  const title = kind === 'swap' ? `Swap ${src.name} with…` : kind === 'move' ? `Move ${src.name} to…` : `Copy ${src.name} to…`;
  const note = kind === 'swap' ? 'The two days trade places.' : kind === 'move' ? `${src.name} becomes empty. The day you pick is replaced.` : `${src.name} stays as it is. The day you pick is replaced.`;
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="muted">{note} You can undo right after.</p>
      <ul className="pick-list">
        {DAYS.filter((d) => d.key !== from).map((d) => (
          <li key={d.key}>
            <button type="button" className="pick-main day-pick" onClick={() => onPick(d.key)} aria-label={`${VERB[kind]} ${src.name} ${kind === 'swap' ? 'with' : 'to'} ${d.name}`}>
              <span className="pick-text"><b>{d.name}</b><small className="muted">{summary(plan[d.key])}</small></span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
