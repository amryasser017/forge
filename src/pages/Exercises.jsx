import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, FolderPlus, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react';
import { useApp, useCol } from '../AppContext';
import Modal from '../components/Modal';
import { byDate, fmtDate } from '../utils';

const seconds = (x) => x.createdAt?.seconds ?? 9e12;

function LiftCard({ x, logs, onRemove }) {
  const { show, unit } = useApp();
  const l = logs.filter((g) => g.exerciseId === x.id).sort(byDate);
  const lastLog = l[l.length - 1];
  const best = l.reduce((m, g) => Math.max(m, g.weight), 0);
  return (
    <div className="lift-wrap">
      <Link to={`/exercises/${x.id}`} className="card lift">
        <h4>{x.name}</h4>
        {lastLog ? (
          <>
            <div className="lift-num">{show(lastLog.weight)}<span>{unit}</span></div>
            <small>Last: {lastLog.reps} reps · {fmtDate(lastLog.date)}</small>
            <div className="lift-best"><Trophy size={15} className="gold" /> Best {show(best)} {unit}</div>
          </>
        ) : <small className="muted">No sets logged yet</small>}
      </Link>
      {onRemove && (
        <button className="icon-btn lift-remove" aria-label={`Remove ${x.name} from this folder`} title="Remove from folder" onClick={onRemove}><X size={16} /></button>
      )}
    </div>
  );
}

/** Add exercises to a folder: pick from the exercises already in the database, or create a new one. */
function AddExerciseModal({ folder, allExercises, onClose }) {
  const { add, upd } = useApp();
  const inFolder = new Set(folder.exerciseIds || []);
  const choices = allExercises.filter((x) => !x.archived && !inFolder.has(x.id)).sort((a, b) => a.name.localeCompare(b.name));
  const [tab, setTab] = useState(choices.length ? 'pick' : 'new');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(() => new Set());
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const shown = choices.filter((x) => x.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function addPicked() {
    if (!picked.size) return;
    setBusy(true);
    await upd('folders', folder.id, { exerciseIds: [...(folder.exerciseIds || []), ...picked] });
    onClose();
  }

  async function createNew(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const dup = allExercises.find((x) => x.name.trim().toLowerCase() === n.toLowerCase());
    if (dup) {
      setError(
        inFolder.has(dup.id)
          ? `"${dup.name}" is already in this folder.`
          : `"${dup.name}" already exists. Use "Choose existing" to add it.`
      );
      return;
    }
    setBusy(true);
    const ref = await add('exercises', { name: n, archived: false });
    await upd('folders', folder.id, { exerciseIds: [...(folder.exerciseIds || []), ref.id] });
    onClose();
  }

  return (
    <Modal title={`Add to ${folder.name}`} onClose={onClose}>
      <div className="seg-group">
        <button type="button" className={'seg' + (tab === 'pick' ? ' on' : '')} onClick={() => setTab('pick')}>Choose existing</button>
        <button type="button" className={'seg' + (tab === 'new' ? ' on' : '')} onClick={() => setTab('new')}>Create new</button>
      </div>

      {tab === 'pick' ? (
        choices.length === 0 ? (
          <div className="empty">Every exercise is already in this folder. Create a new one instead.</div>
        ) : (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" aria-label="Search exercises" />
            {shown.length === 0 && <div className="empty">No match.</div>}
            {shown.map((x) => (
              <label key={x.id} className={'pick' + (picked.has(x.id) ? ' on' : '')}>
                <input type="checkbox" checked={picked.has(x.id)} onChange={() => toggle(x.id)} />
                {x.name}
              </label>
            ))}
            <button type="button" className="btn primary" disabled={!picked.size || busy} onClick={addPicked}>
              {picked.size ? `Add ${picked.size} to folder` : 'Select exercises'}
            </button>
          </>
        )
      ) : (
        <form className="form" onSubmit={createNew}>
          <label>Exercise name
            <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="e.g. Incline dumbbell press" />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="btn primary" disabled={!name.trim() || busy}>Create &amp; add</button>
        </form>
      )}
    </Modal>
  );
}

function FolderNameModal({ folder, onClose }) {
  const { upd } = useApp();
  const [name, setName] = useState(folder.name);
  async function save(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    await upd('folders', folder.id, { name: n });
    onClose();
  }
  return (
    <Modal title="Rename folder" onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>Folder name<input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></label>
        <button className="btn primary" disabled={!name.trim()}>Save</button>
      </form>
    </Modal>
  );
}

export default function Exercises() {
  const { add, upd, del } = useApp();
  const ex = useCol('exercises').items;
  const folders = [...useCol('folders').items].sort((a, b) => seconds(a) - seconds(b));
  const logs = useCol('logs').items;
  const [name, setName] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(() => new Set()); // expanded folder ids; folders start collapsed
  const [adding, setAdding] = useState(null); // folder id
  const [renaming, setRenaming] = useState(null); // folder id

  async function createFolder(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const ref = await add('folders', { name: n, exerciseIds: [] });
    setName('');
    setOpen((o) => new Set(o).add(ref.id)); // open the new folder so exercises can be added right away
  }
  const flip = (id) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const byId = Object.fromEntries(ex.map((x) => [x.id, x]));
  const byName = (a, b) => a.name.localeCompare(b.name);
  const inAnyFolder = new Set(folders.flatMap((f) => f.exerciseIds || []));
  const unfiled = ex.filter((x) => !x.archived && !inAnyFolder.has(x.id)).sort(byName);
  const archived = ex.filter((x) => x.archived).sort(byName);
  const addFolder = folders.find((f) => f.id === adding);
  const renameFolder = folders.find((f) => f.id === renaming);

  return (
    <div className="page">
      <h1 className="page-title">My lifts</h1>
      <form className="panel inline-form" onSubmit={createFolder}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New folder, e.g. Chest day" aria-label="Folder name" />
        <button className="btn primary"><FolderPlus size={18} /> Add folder</button>
      </form>

      <div className="seg-row">
        <div className="seg-group">
          <button className={'seg' + (!showArchived ? ' on' : '')} onClick={() => setShowArchived(false)}>Active</button>
          <button className={'seg' + (showArchived ? ' on' : '')} onClick={() => setShowArchived(true)}>Archived</button>
        </div>
      </div>

      {showArchived ? (
        archived.length === 0 ? <div className="panel empty">Nothing archived.</div> : (
          <div className="cards">{archived.map((x) => <LiftCard key={x.id} x={x} logs={logs} />)}</div>
        )
      ) : (
        <>
          {folders.length === 0 && unfiled.length === 0 && (
            <div className="panel empty">Create your first folder above (for example "Chest day"), then add exercises to it and log your weights inside each exercise.</div>
          )}

          <div className="sched-list">
            {folders.map((f) => {
              const items = (f.exerciseIds || []).map((id) => byId[id]).filter((x) => x && !x.archived);
              const isOpen = open.has(f.id);
              return (
                <section key={f.id} className="panel sched-day">
                  <div className="sched-head">
                    <button className="sched-toggle" aria-expanded={isOpen} onClick={() => flip(f.id)}>
                      <h4>{f.name}</h4>
                      <small>{items.length} {items.length === 1 ? 'exercise' : 'exercises'}</small>
                      <ChevronDown size={20} className={'chev' + (isOpen ? ' open' : '')} />
                    </button>
                    <button className="icon-btn" aria-label="Rename folder" onClick={() => setRenaming(f.id)}><Pencil size={18} /></button>
                    <button
                      className="icon-btn danger"
                      aria-label="Delete folder"
                      onClick={() => window.confirm(`Delete the folder "${f.name}"? Your exercises and logged sets are kept.`) && del('folders', f.id)}
                    ><Trash2 size={18} /></button>
                  </div>
                  {isOpen && (
                    <>
                      {items.length === 0 ? <small className="muted">No exercises in this folder yet.</small> : (
                        <div className="cards">
                          {items.map((x) => (
                            <LiftCard key={x.id} x={x} logs={logs} onRemove={() => upd('folders', f.id, { exerciseIds: (f.exerciseIds || []).filter((id) => id !== x.id) })} />
                          ))}
                        </div>
                      )}
                      <button className="btn ghost" onClick={() => setAdding(f.id)}><Plus size={16} /> Add exercise</button>
                    </>
                  )}
                </section>
              );
            })}
          </div>

          {unfiled.length > 0 && (
            <section className="unfiled">
              <h3 className="section-title">{folders.length ? 'Not in a folder' : 'Your exercises'}</h3>
              {folders.length === 0 && <p className="muted">Create a folder to organize these, then use "Add exercise" ▸ "Choose existing".</p>}
              <div className="cards">{unfiled.map((x) => <LiftCard key={x.id} x={x} logs={logs} />)}</div>
            </section>
          )}
        </>
      )}

      {addFolder && <AddExerciseModal folder={addFolder} allExercises={ex} onClose={() => setAdding(null)} />}
      {renameFolder && <FolderNameModal folder={renameFolder} onClose={() => setRenaming(null)} />}
    </div>
  );
}
