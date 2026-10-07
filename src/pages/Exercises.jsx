import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trophy } from 'lucide-react';
import { useApp, useCol } from '../AppContext';
import { byDate, fmtDate } from '../utils';

export default function Exercises() {
  const { add, show, unit } = useApp();
  const ex = useCol('exercises').items;
  const logs = useCol('logs').items;
  const [name, setName] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  async function create(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    await add('exercises', { name: n, archived: false });
    setName('');
  }

  const list = ex.filter((x) => !!x.archived === showArchived).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page">
      <h1 className="page-title">My lifts</h1>
      <form className="panel inline-form" onSubmit={create}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New exercise, e.g. Bench press" aria-label="Exercise name" />
        <button className="btn primary"><Plus size={18} /> Add exercise</button>
      </form>

      <div className="seg-row">
        <div className="seg-group">
          <button className={'seg' + (!showArchived ? ' on' : '')} onClick={() => setShowArchived(false)}>Active</button>
          <button className={'seg' + (showArchived ? ' on' : '')} onClick={() => setShowArchived(true)}>Archived</button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="panel empty">{showArchived ? 'Nothing archived.' : 'Add your first exercise above, then log your weights inside it.'}</div>
      ) : (
        <div className="cards">
          {list.map((x) => {
            const l = logs.filter((g) => g.exerciseId === x.id).sort(byDate);
            const lastLog = l[l.length - 1];
            const best = l.reduce((m, g) => Math.max(m, g.weight), 0);
            return (
              <Link key={x.id} to={`/exercises/${x.id}`} className="card lift">
                <h4>{x.name}</h4>
                {lastLog ? (
                  <>
                    <div className="lift-num">{show(lastLog.weight)}<span>{unit}</span></div>
                    <small>Last: {lastLog.reps} reps · {fmtDate(lastLog.date)}</small>
                    <div className="lift-best"><Trophy size={15} className="gold" /> Best {show(best)} {unit}</div>
                  </>
                ) : <small className="muted">No sets logged yet</small>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
