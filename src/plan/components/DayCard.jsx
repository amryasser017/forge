import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeftRight, ArrowUp, ChevronDown, Copy, GripVertical, MoveRight, Plus, Trash2, X } from 'lucide-react';
import ExerciseImage from '../../library/components/ExerciseImage';
import Glance from '../../progress/Glance';
import { Stepper } from '@forge/ui';
import { FOLDERS, FOLDER_BY_KEY } from '../../library/data/muscleFolders';
import { moveItem, removeItem, setTargets, toggleFocus } from '../plan';

const canDrag = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;

function ItemRow({ it, i, n, doc, lib, logs, onOpen, onChange, onRemove, onMove, dragFrom, setDragFrom, onDropTo }) {
  const name = doc?.name ?? 'Removed exercise';
  return (
    <li
      className={'plan-item' + (dragFrom === i ? ' dragging' : '')}
      draggable={canDrag()}
      onDragStart={() => setDragFrom(i)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => { onDropTo(i); setDragFrom(null); }}
      onDragEnd={() => setDragFrom(null)}
    >
      <span className="grip" aria-hidden><GripVertical size={16} /></span>
      <button type="button" className="plan-item-main" onClick={() => doc && onOpen(doc, it)} disabled={!doc} aria-label={`Open ${name}`}>
        {lib ? <ExerciseImage ex={lib} className="ex-thumb sm" /> : <span className="ex-img ex-thumb sm ex-img-empty" aria-hidden>{FOLDER_BY_KEY[doc?.folderKey]?.emoji ?? '🛠️'}</span>}
        <span className="plan-item-text"><b>{name}</b><Glance logs={logs} /></span>
      </button>
      <div className="plan-item-actions">
        <button type="button" className="icon-btn" aria-label={`Move ${name} up`} disabled={i === 0} onClick={() => onMove(i, i - 1)}><ArrowUp size={16} /></button>
        <button type="button" className="icon-btn" aria-label={`Move ${name} down`} disabled={i === n - 1} onClick={() => onMove(i, i + 1)}><ArrowDown size={16} /></button>
        <button type="button" className="icon-btn danger" aria-label={`Remove ${name}`} onClick={onRemove}><X size={16} /></button>
      </div>
      <div className="target-editor">
        <Stepper label="Sets" value={it.targetSets} min={1} max={20} onChange={(v) => onChange(v, it.targetReps)} />
        <span aria-hidden>×</span>
        <Stepper label="Reps" value={it.targetReps} min={1} max={100} onChange={(v) => onChange(it.targetSets, v)} />
      </div>
    </li>
  );
}

/** One weekday of the plan: label, rest toggle, focus muscles and the ordered exercises. */
export default function DayCard({ info, day, isToday, open, onToggle, docsById, libById, logsBy, onChange, onAdd, onOpenItem, onDayAction }) {
  const [label, setLabel] = useState(day.label);
  const [dragFrom, setDragFrom] = useState(null);
  useEffect(() => setLabel(day.label), [day.label]);
  const n = day.items.length;
  const commitLabel = () => { const t = label.trim().slice(0, 40); if (t !== day.label) onChange({ ...day, label: t }); };

  return (
    <section className={'panel sched-day' + (isToday ? ' today' : '')} aria-label={info.name}>
      <div className="sched-head">
        <button className="sched-toggle" aria-expanded={open} onClick={onToggle}>
          <h4>{info.name}</h4>
          {isToday && <i className="chip-sm pop">Today</i>}
          {day.label && <i className="chip-sm">{day.label}</i>}
          <small>{day.rest ? 'Rest day' : n === 0 ? 'Empty' : `${n} ${n === 1 ? 'exercise' : 'exercises'}`}</small>
          <ChevronDown size={20} className={'chev' + (open ? ' open' : '')} />
        </button>
      </div>

      {open && (
        <>
          <div className="day-controls">
            <label>Label (optional)
              <input value={label} maxLength={40} placeholder="e.g. Chest + Triceps" onChange={(e) => setLabel(e.target.value)} onBlur={commitLabel} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
            </label>
            <label className="switch">
              <input type="checkbox" checked={day.rest} onChange={(e) => onChange({ ...day, rest: e.target.checked })} />
              <span>Rest day</span>
            </label>
          </div>

          <div className="day-actions" role="group" aria-label={`${info.name} actions`}>
            <button type="button" className="btn ghost" onClick={() => onDayAction('move')}><MoveRight size={16} /> Move day</button>
            <button type="button" className="btn ghost" onClick={() => onDayAction('swap')}><ArrowLeftRight size={16} /> Swap</button>
            <button type="button" className="btn ghost" onClick={() => onDayAction('copy')}><Copy size={16} /> Copy</button>
            <button type="button" className="btn ghost danger-btn" disabled={n === 0} onClick={() => onDayAction('clear')}><Trash2 size={16} /> Clear day</button>
          </div>

          {day.rest ? (
            <p className="muted">{n > 0 ? `Rest day. Your ${n} planned exercise${n === 1 ? ' is' : 's are'} kept if you switch it back.` : 'Rest day. Recovery is part of the plan.'}</p>
          ) : (
            <>
              <div>
                <small className="muted">Focus muscles (used for suggestions)</small>
                <div className="chips-row" role="group" aria-label={`${info.name} focus muscles`}>
                  {FOLDERS.map((f) => (
                    <button key={f.key} type="button" className={'chip-btn' + (day.focus.includes(f.key) ? ' on' : '')} aria-pressed={day.focus.includes(f.key)} onClick={() => onChange(toggleFocus(day, f.key))}>{f.emoji} {f.label}</button>
                  ))}
                </div>
              </div>
              {n === 0 ? <div className="empty">No exercises yet. Add the first one.</div> : (
                <ul className="plan-items">
                  {day.items.map((it, i) => {
                    const doc = docsById[it.exerciseId];
                    return (
                      <ItemRow
                        key={it.exerciseId}
                        it={it} i={i} n={n} doc={doc} lib={doc?.libId ? libById[doc.libId] : null} logs={logsBy[it.exerciseId]}
                        onOpen={onOpenItem}
                        onChange={(s, r) => onChange(setTargets(day, it.exerciseId, s, r))}
                        onRemove={() => onChange(removeItem(day, it.exerciseId))}
                        onMove={(from, to) => onChange(moveItem(day, from, to))}
                        dragFrom={dragFrom} setDragFrom={setDragFrom}
                        onDropTo={(to) => dragFrom != null && onChange(moveItem(day, dragFrom, to))}
                      />
                    );
                  })}
                </ul>
              )}
              <button type="button" className="btn ghost" onClick={onAdd}><Plus size={16} /> Add exercise</button>
            </>
          )}
        </>
      )}
    </section>
  );
}
