import { useDeferredValue, useMemo, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import ExerciseImage from '../../library/components/ExerciseImage';
import Sheet from '../../ui/Sheet';
import Stepper from '../../ui/Stepper';
import { FOLDERS, FOLDER_BY_KEY, MECHANIC_LABEL } from '../../library/data/muscleFolders';
import { useExerciseLibrary } from '../../library/exerciseData';
import { folderItems, searchIndex } from '../../library/exerciseSearch';
import { customView, docView, libView } from '../../library/exerciseViews';
import { DEFAULT_REPS, DEFAULT_SETS, hasItem } from '../plan';

const PAGE = 30;

function Thumb({ v }) {
  return v.lib ? <ExerciseImage ex={v.lib} className="ex-thumb sm" /> : <span className="ex-img ex-thumb sm ex-img-empty" aria-hidden>{FOLDER_BY_KEY[v.folder]?.emoji ?? '🛠️'}</span>;
}

function PickRow({ v, added, open, onToggle, onAdd, dayName }) {
  const [sets, setSets] = useState(DEFAULT_SETS);
  const [reps, setReps] = useState(DEFAULT_REPS);
  const [busy, setBusy] = useState(false);
  return (
    <li className={'pick-row' + (added ? ' added' : '')}>
      <button type="button" className="pick-main" onClick={onToggle} disabled={added} aria-expanded={open} aria-label={added ? `${v.name}, already added` : `${v.name}, choose sets and reps`}>
        <Thumb v={v} />
        <span className="pick-text">
          <b>{v.name}</b>
          <span className="chips-sm">
            {v.group && <i className="chip-sm">{v.group}</i>}
            {v.mechanic && <i className="chip-sm">{MECHANIC_LABEL[v.mechanic]}</i>}
            {v.popular && <i className="chip-sm pop">★ Popular</i>}
          </span>
        </span>
        <span className={'pick-state' + (added ? ' ok' : '')} aria-hidden>{added ? <Check size={20} /> : <Plus size={20} />}</span>
      </button>
      {open && !added && (
        <div className="pick-steppers">
          <Stepper label="Sets" value={sets} onChange={setSets} min={1} max={20} />
          <span aria-hidden>×</span>
          <Stepper label="Reps" value={reps} onChange={setReps} min={1} max={100} />
          <button type="button" className="btn primary" disabled={busy} onClick={async () => { setBusy(true); try { await onAdd(v, sets, reps); } finally { setBusy(false); } }}>
            Add to {dayName}
          </button>
        </div>
      )}
    </li>
  );
}

/** Full-height sheet to add exercises to one plan day. Favorites, Recent, focus suggestions, browse by muscle, search. */
/** `docs` = the athlete's exercise documents and `recentIds` = ids of recently logged exercises, both passed in by the Plan page. */
export default function PlanPicker({ info, day, docs, recentIds, onAdd, onClose }) {
  const { index, byId } = useExerciseLibrary();
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q.trim());
  const [browse, setBrowse] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [openKey, setOpenKey] = useState(null);
  const [limit, setLimit] = useState(PAGE);

  const activeDocs = useMemo(() => docs.filter((d) => !d.archived), [docs]);
  const docByLibId = useMemo(() => Object.fromEntries(docs.filter((d) => d.libId).map((d) => [d.libId, d])), [docs]);
  const favorites = useMemo(() => activeDocs.filter((d) => d.favorite).map((d) => docView(d, byId)), [activeDocs, byId]);
  const recents = useMemo(() => recentIds.map((id) => activeDocs.find((d) => d.id === id)).filter(Boolean).map((d) => docView(d, byId)), [recentIds, activeDocs, byId]);
  const suggestions = useMemo(() => {
    if (!index) return [];
    const seen = new Set();
    const out = [];
    for (const key of day.focus) {
      for (const ex of folderItems(index, key, { popularOnly: true }).slice(0, 8)) {
        if (!seen.has(ex.id)) { seen.add(ex.id); out.push(libView(ex, docByLibId[ex.id])); }
      }
    }
    return out;
  }, [index, day.focus, docByLibId]);
  const results = useMemo(() => {
    if (!dq || !index) return null;
    const lib = searchIndex(index, dq, { limit: 200 }).map((ex) => libView(ex, docByLibId[ex.id]));
    const custom = activeDocs.filter((d) => !d.libId && d.name.toLowerCase().includes(dq.toLowerCase())).map(customView);
    return [...custom, ...lib];
  }, [dq, index, activeDocs, docByLibId]);
  const browseList = useMemo(() => {
    if (!browse || !index) return null;
    const lib = folderItems(index, browse, { popularOnly: !showAll }).map((ex) => libView(ex, docByLibId[ex.id]));
    const custom = activeDocs.filter((d) => !d.libId && d.folderKey === browse).map(customView);
    return [...custom, ...lib];
  }, [browse, showAll, index, activeDocs, docByLibId]);

  const row = (v) => (
    <PickRow key={v.key} v={v} dayName={info.name} added={hasItem(day, v.docId)} open={openKey === v.key} onToggle={() => setOpenKey(openKey === v.key ? null : v.key)} onAdd={onAdd} />
  );
  const list = (items) => <ul className="pick-list">{items.map(row)}</ul>;

  return (
    <Sheet title={`Add to ${info.name}`} onClose={onClose}>
      <div className="picker">
        <div className="sticky-search inset">
          <Search size={18} aria-hidden />
          <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Search all exercises" aria-label="Search exercises" />
          {q && <button className="icon-btn" aria-label="Clear search" onClick={() => setQ('')}><X size={18} /></button>}
        </div>

        {results ? (
          results.length === 0 ? <div className="empty">No match for &ldquo;{dq}&rdquo;.</div> : (
            <>
              {list(results.slice(0, limit))}
              {results.length > limit && <button className="btn ghost wide" onClick={() => setLimit((l) => l + PAGE)}>Show more</button>}
            </>
          )
        ) : (
          <>
            {favorites.length > 0 && <section><h4 className="pick-title">⭐ Favorites</h4>{list(favorites)}</section>}
            {recents.length > 0 && <section><h4 className="pick-title">🕘 Recent</h4>{list(recents)}</section>}
            {day.focus.length > 0 && (
              <section>
                <h4 className="pick-title">Popular for {day.label || day.focus.map((k) => FOLDER_BY_KEY[k]?.label).filter(Boolean).join(' + ')}</h4>
                {index ? (suggestions.length ? list(suggestions) : <div className="empty">No popular exercises for this focus.</div>) : <p className="muted">Loading exercises…</p>}
              </section>
            )}
            {day.focus.length === 0 && favorites.length + recents.length === 0 && <p className="muted">Tip: choose muscles for this day on the day card to get suggestions here. Or browse by muscle below.</p>}
            <section>
              <h4 className="pick-title">Browse by muscle</h4>
              <div className="chips-row" role="group" aria-label="Muscle folders">
                {FOLDERS.map((f) => (
                  <button key={f.key} className={'chip-btn' + (browse === f.key ? ' on' : '')} onClick={() => { setBrowse(browse === f.key ? null : f.key); setShowAll(false); setLimit(PAGE); }}>{f.emoji} {f.label}</button>
                ))}
              </div>
              {browse && (browseList ? (
                <>
                  {list(browseList.slice(0, limit))}
                  {browseList.length > limit && <button className="btn ghost wide" onClick={() => setLimit((l) => l + PAGE)}>Show more</button>}
                  <button className="btn ghost wide" onClick={() => { setShowAll((s) => !s); setLimit(PAGE); }}>{showAll ? 'Show popular only' : 'Show all exercises in this folder'}</button>
                </>
              ) : <p className="muted">Loading exercises…</p>)}
            </section>
          </>
        )}
      </div>
    </Sheet>
  );
}
