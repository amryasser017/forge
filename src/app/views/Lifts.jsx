import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, History, Plus, Search, Star, X } from 'lucide-react';
import { useApp, useCol } from '../../AppContext';
import ExerciseImage from '../../library/components/ExerciseImage';
import MyCustom from '../../library/components/MyCustom';
import Modal from '../../ui/Modal';
import { CUSTOM_FOLDER, EQUIPMENT_GROUPS, FOLDERS, FOLDER_BY_KEY, MECHANIC_LABEL, equipmentGroup, folderKeyOf } from '../../library/data/muscleFolders';
import { POPULAR_SET } from '../../library/data/popular';
import { customView, docView as makeDocView, libView, recentExerciseIds } from '../../library/exerciseViews';
import { useExerciseLibrary } from '../../library/exerciseData';
import { folderItems, searchIndex } from '../../library/exerciseSearch';

const PAGE = 40;

function ExerciseCard({ v, last, showFolder }) {
  const { show, unit } = useApp();
  const f = FOLDER_BY_KEY[v.folder];
  return (
    <Link to={`/exercises/${v.docId}`} className="ex-card">
      {v.lib ? <ExerciseImage ex={v.lib} className="ex-thumb" /> : <span className="ex-img ex-thumb ex-img-empty" aria-hidden>{f?.emoji ?? '🛠️'}</span>}
      <span className="ex-card-main">
        <b className="ex-card-name">{v.name}</b>
        <span className="chips-sm">
          {showFolder && f && <i className="chip-sm folder">{f.emoji} {f.label}</i>}
          {v.group && <i className="chip-sm">{v.group}</i>}
          {v.mechanic && <i className="chip-sm">{MECHANIC_LABEL[v.mechanic]}</i>}
          {v.popular && <i className="chip-sm pop">★ Popular</i>}
          {v.custom && <i className="chip-sm">Custom</i>}
        </span>
        {last && <small className="muted">Last: {show(last.weight)} {unit} × {last.reps}</small>}
      </span>
    </Link>
  );
}

function CardSkeletons({ n = 6 }) {
  return <div className="ex-grid" aria-busy="true">{Array.from({ length: n }, (_, i) => <div key={i} className="ex-card"><span className="ex-img ex-thumb"><span className="skeleton" /></span><span className="ex-card-main"><span className="skeleton-line" /><span className="skeleton-line short" /></span></div>)}</div>;
}

function CreateCustomModal({ docs, onClose, folder }) {
  const { add } = useApp();
  const [name, setName] = useState('');
  const [folderKey, setFolderKey] = useState(folder && FOLDER_BY_KEY[folder] ? folder : '');
  const [equipment, setEquipment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (docs.some((d) => d.name.trim().toLowerCase() === n.toLowerCase())) { setError(`"${n}" already exists in your lifts.`); return; }
    setBusy(true);
    await add('exercises', { name: n, archived: false, favorite: false, custom: true, folderKey: folderKey || null, equipment: equipment || null });
    onClose();
  }
  return (
    <Modal title="Create custom exercise" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>Exercise name<input autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="e.g. Cable fly (low to high)" /></label>
        <label>Muscle folder
          <select value={folderKey} onChange={(e) => setFolderKey(e.target.value)}>
            <option value="">None (only in My custom)</option>
            {FOLDERS.map((f) => <option key={f.key} value={f.key}>{f.emoji} {f.label}</option>)}
          </select>
        </label>
        <label>Equipment
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            <option value="">Not set</option>
            {EQUIPMENT_GROUPS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={!name.trim() || busy}>Create</button>
      </form>
    </Modal>
  );
}

export default function Exercises() {
  const docs = useCol('exercises').items;
  const logs = useCol('logs').items;
  const { data, index, byId, error } = useExerciseLibrary();
  const [params, setParams] = useSearchParams();
  const folderKey = params.get('folder');
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query.trim());
  const [equip, setEquip] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [creating, setCreating] = useState(false);

  const docByLibId = useMemo(() => Object.fromEntries(docs.filter((d) => d.libId).map((d) => [d.libId, d])), [docs]);
  const activeDocs = useMemo(() => docs.filter((d) => !d.archived), [docs]);
  const lastBy = useMemo(() => {
    const m = {};
    for (const l of logs) {
      const cur = m[l.exerciseId];
      if (!cur || l.date > cur.date || (l.date === cur.date && (l.createdAt?.seconds ?? 0) >= (cur.createdAt?.seconds ?? 0))) m[l.exerciseId] = l;
    }
    return m;
  }, [logs]);

  const docView = (d) => makeDocView(d, byId);
  const goFolder = (k) => { setParams(k ? { folder: k } : {}); setEquip(''); setShowAll(false); setLimit(PAGE); };

  // ---- home data
  const favorites = useMemo(() => activeDocs.filter((d) => d.favorite).map(docView), [activeDocs, byId]); // eslint-disable-line react-hooks/exhaustive-deps
  const recents = useMemo(() => recentExerciseIds(logs, 6).map((id) => activeDocs.find((d) => d.id === id)).filter(Boolean).map(docView), [logs, activeDocs, byId]); // eslint-disable-line react-hooks/exhaustive-deps
  const loggedCount = useMemo(() => {
    const c = {};
    const seen = new Set();
    for (const l of logs) {
      if (seen.has(l.exerciseId)) continue;
      seen.add(l.exerciseId);
      const d = docs.find((x) => x.id === l.exerciseId);
      if (!d) continue;
      const k = d.libId ? (byId[d.libId] ? folderKeyOf(byId[d.libId]) : null) : d.folderKey;
      if (k) c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [logs, docs, byId]);
  const totals = useMemo(() => {
    const t = {};
    if (data) for (const x of data) t[folderKeyOf(x)] = (t[folderKeyOf(x)] || 0) + 1;
    return t;
  }, [data]);
  const customCount = docs.filter((d) => !d.libId).length;

  // ---- search results
  const results = useMemo(() => {
    if (!deferred) return null;
    const lib = index ? searchIndex(index, deferred, { limit: 300 }).map((ex) => libView(ex, docByLibId[ex.id])) : [];
    const q = deferred.toLowerCase();
    const custom = docs.filter((d) => !d.libId && !d.archived && d.name.toLowerCase().includes(q)).map(customView);
    return [...custom, ...lib];
  }, [deferred, index, docs, docByLibId]);

  // ---- folder view
  const folder = FOLDER_BY_KEY[folderKey];
  const folderList = useMemo(() => {
    if (!folder || !index) return null;
    const lib = folderItems(index, folder.key, { equipment: equip || undefined, popularOnly: !showAll }).map((ex) => libView(ex, docByLibId[ex.id]));
    const custom = activeDocs.filter((d) => !d.libId && d.folderKey === folder.key && (!equip || d.equipment === equip)).map(customView);
    return [...custom, ...lib];
  }, [folder, index, equip, showAll, docByLibId, activeDocs]);
  const folderCounts = useMemo(() => {
    if (!folder || !index) return null;
    const all = folderItems(index, folder.key);
    const groups = {};
    for (const ex of all) groups[equipmentGroup(ex.equipment)] = (groups[equipmentGroup(ex.equipment)] || 0) + 1;
    return { all: all.length, popular: all.filter((e) => POPULAR_SET.has(e.id)).length, groups };
  }, [folder, index]);

  return (
    <div className="page">
      <h1 className="page-title">My lifts</h1>

      <div className="sticky-search">
        <Search size={18} aria-hidden />
        <input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} placeholder="Search all exercises (e.g. pulldown, biceps)" aria-label="Search exercises" />
        {query && <button className="icon-btn" aria-label="Clear search" onClick={() => setQuery('')}><X size={18} /></button>}
      </div>

      {error && <div className="panel empty">The exercise library could not load. Check your connection and refresh.</div>}

      {results ? (
        <section aria-live="polite">
          {!index && !error ? <CardSkeletons /> : results.length === 0 ? (
            <div className="panel empty">No exercise matches &ldquo;{deferred}&rdquo;. <button className="link" onClick={() => setCreating(true)}>Create a custom exercise</button></div>
          ) : (
            <>
              <p className="muted">{results.length}{results.length >= 300 ? '+' : ''} results · popular first</p>
              <div className="ex-grid">{results.slice(0, limit).map((v) => <ExerciseCard key={v.key} v={v} last={lastBy[v.docId]} showFolder />)}</div>
              {results.length > limit && <button className="btn ghost wide" onClick={() => setLimit((l) => l + PAGE)}>Show more</button>}
            </>
          )}
        </section>
      ) : folderKey === 'custom' ? (
        <>
          <button className="back" onClick={() => goFolder(null)}><ArrowLeft size={16} /> All folders</button>
          <h2 className="folder-title"><span aria-hidden>{CUSTOM_FOLDER.emoji}</span> {CUSTOM_FOLDER.label}</h2>
          <MyCustom />
        </>
      ) : folder ? (
        <>
          <button className="back" onClick={() => goFolder(null)}><ArrowLeft size={16} /> All folders</button>
          <h2 className="folder-title"><span aria-hidden>{folder.emoji}</span> {folder.label}{folderCounts && <small className="muted"> · {folderCounts.all} exercises</small>}</h2>
          {folderCounts && (
            <div className="chips-row" role="group" aria-label="Filter by equipment">
              <button className={'chip-btn' + (!equip ? ' on' : '')} onClick={() => setEquip('')}>All</button>
              {EQUIPMENT_GROUPS.filter((g) => folderCounts.groups[g]).map((g) => (
                <button key={g} className={'chip-btn' + (equip === g ? ' on' : '')} onClick={() => setEquip(equip === g ? '' : g)}>{g}</button>
              ))}
            </div>
          )}
          {!folderList ? <CardSkeletons /> : (
            <>
              {folderList.length === 0 && <div className="panel empty">{showAll ? 'Nothing here for this filter.' : 'No popular exercises for this filter. Try "Show all".'}</div>}
              <div className="ex-grid">{folderList.slice(0, limit).map((v) => <ExerciseCard key={v.key} v={v} last={lastBy[v.docId]} />)}</div>
              {folderList.length > limit && <button className="btn ghost wide" onClick={() => setLimit((l) => l + PAGE)}>Show more ({folderList.length - limit} left)</button>}
              {folderCounts && folderCounts.all > folderCounts.popular && (
                <button className="btn ghost wide" onClick={() => { setShowAll((s) => !s); setLimit(PAGE); }}>
                  {showAll ? `Show popular only (${folderCounts.popular})` : `Show all ${folderCounts.all} exercises`}
                </button>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {favorites.length > 0 && (
            <section>
              <h3 className="section-title"><Star size={18} className="gold" aria-hidden /> Favorites</h3>
              <div className="ex-grid">{favorites.map((v) => <ExerciseCard key={v.key} v={v} last={lastBy[v.docId]} showFolder />)}</div>
            </section>
          )}
          {recents.length > 0 && (
            <section>
              <h3 className="section-title"><History size={18} className="volt" aria-hidden /> Recent</h3>
              <div className="ex-grid">{recents.map((v) => <ExerciseCard key={v.key} v={v} last={lastBy[v.docId]} showFolder />)}</div>
            </section>
          )}
          <section>
            <h3 className="section-title">Muscle folders</h3>
            <div className="folder-grid">
              {FOLDERS.map((f) => (
                <button key={f.key} className="folder-card" onClick={() => goFolder(f.key)} aria-label={`${f.label} folder`}>
                  <span className="folder-emoji" aria-hidden>{f.emoji}</span>
                  <b>{f.label}</b>
                  <small className="muted">{data ? `${loggedCount[f.key] || 0} of ${totals[f.key] || 0} logged` : `${loggedCount[f.key] || 0} logged`}</small>
                </button>
              ))}
              <button className="folder-card custom" onClick={() => goFolder('custom')} aria-label="My custom folder">
                <span className="folder-emoji" aria-hidden>{CUSTOM_FOLDER.emoji}</span>
                <b>{CUSTOM_FOLDER.label}</b>
                <small className="muted">{customCount} exercise{customCount === 1 ? '' : 's'}</small>
              </button>
            </div>
            {!data && !error && <p className="muted" role="status">Loading the exercise library…</p>}
          </section>
          <button className="btn ghost" onClick={() => setCreating(true)}><Plus size={16} /> Create custom exercise</button>
        </>
      )}

      {creating && <CreateCustomModal docs={docs} folder={folderKey} onClose={() => setCreating(false)} />}
    </div>
  );
}
