import { MECHANIC_LABEL, muscleLabel } from '../../data/muscleFolders';

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Primary muscles highlighted, secondary muted, then equipment / level / mechanic / force. */
export default function MuscleChips({ ex }) {
  const info = [
    ex.equipment && { k: 'Equipment', v: cap(ex.equipment === 'body only' ? 'bodyweight' : ex.equipment) },
    ex.level && { k: 'Level', v: cap(ex.level) },
    ex.mechanic && { k: 'Type', v: MECHANIC_LABEL[ex.mechanic] },
    ex.force && { k: 'Force', v: cap(ex.force) },
  ].filter(Boolean);
  return (
    <div className="muscle-chips">
      <div className="chips-sm" role="group" aria-label="Muscles worked: highlighted are primary, grey are secondary">
        {(ex.primaryMuscles || []).map((m) => <i key={m} className="chip-sm primary">{muscleLabel(m)}</i>)}
        {(ex.secondaryMuscles || []).map((m) => <i key={m} className="chip-sm">{muscleLabel(m)}</i>)}
      </div>
      {info.length > 0 && (
        <dl className="info-line">
          {info.map((x) => <div key={x.k}><dt>{x.k}</dt><dd>{x.v}</dd></div>)}
        </dl>
      )}
      {!ex.equipment && <small className="muted">Equipment not specified</small>}
    </div>
  );
}
