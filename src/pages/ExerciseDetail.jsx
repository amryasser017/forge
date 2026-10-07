import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, Pencil, Trash2, Trophy } from 'lucide-react';
import { useApp, useCol } from '../AppContext';
import ChartCard from '../components/ChartCard';
import { COLORS, byDate, computePRs, epley, fmtDate, r1, shortDate, todayStr } from '../utils';

export default function ExerciseDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { add, upd, del, show, toKg, unit } = useApp();
  const exercises = useCol('exercises');
  const allLogs = useCol('logs').items;
  const ex = exercises.items.find((x) => x.id === id);

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('');
  const [date, setDate] = useState(todayStr());
  const [pr, setPr] = useState(false);

  if (exercises.loading) return <div className="page" />;
  if (!ex) return <div className="page"><Link to="/exercises" className="link">Back to lifts</Link><div className="panel empty">This exercise no longer exists.</div></div>;

  const logs = allLogs.filter((l) => l.exerciseId === id).sort(byDate);
  const prIds = computePRs(allLogs);
  const best = logs.reduce((m, l) => Math.max(m, l.weight), 0);
  const best1rm = logs.reduce((m, l) => Math.max(m, epley(l.weight, l.reps)), 0);
  const last = logs[logs.length - 1];

  // best set per day for the chart
  const perDay = {};
  logs.forEach((l) => { perDay[l.date] = Math.max(perDay[l.date] || 0, l.weight); });
  const chart = Object.keys(perDay).sort().map((d) => ({ label: shortDate(d), weight: show(perDay[d]) }));

  async function addLog(e) {
    e.preventDefault();
    const kg = toKg(weight);
    if (kg == null) return;
    const wasPR = logs.length > 0 && kg > best;
    await add('logs', { exerciseId: id, exerciseName: ex.name, weight: kg, reps: parseInt(reps, 10) || 1, sets: parseInt(sets, 10) || 1, date });
    setPr(wasPR); if (wasPR) setTimeout(() => setPr(false), 4000);
    setWeight(''); setReps(''); setSets('');
  }
  async function rename() {
    const n = prompt('Rename exercise', ex.name);
    if (n && n.trim()) {
      await upd('exercises', id, { name: n.trim() });
    }
  }
  async function remove() {
    if (!confirm(`Delete "${ex.name}" and all its logs?`)) return;
    await Promise.all(logs.map((l) => del('logs', l.id)));
    await del('exercises', id);
    nav('/exercises');
  }

  return (
    <div className="page">
      <Link to="/exercises" className="back"><ArrowLeft size={17} /> All lifts</Link>
      <div className="title-row">
        <h1 className="page-title">{ex.name}</h1>
        <div className="seg-row">
          <button className="icon-btn" title="Rename" onClick={rename}><Pencil size={18} /></button>
          <button className="icon-btn" title={ex.archived ? 'Restore' : 'Archive'} onClick={() => upd('exercises', id, { archived: !ex.archived })}><Archive size={18} /></button>
          <button className="icon-btn danger" title="Delete" onClick={remove}><Trash2 size={18} /></button>
        </div>
      </div>

      {pr && <div className="pr-banner"><Trophy size={22} /> New personal record. That is the work paying off.</div>}

      <div className="stats three">
        <div className="stat"><small>Last weight</small><b>{last ? show(last.weight) : '–'}<em>{unit}</em></b></div>
        <div className="stat"><small>Best weight</small><b>{best ? show(best) : '–'}<em>{unit}</em></b></div>
        <div className="stat"><small>Est. 1-rep max</small><b>{best1rm ? r1(Number(show(best1rm))) : '–'}<em>{unit}</em></b></div>
      </div>

      <form className="panel form" onSubmit={addLog}>
        <h3>Log a set</h3>
        <div className="grid4">
          <label>Weight ({unit})<input inputMode="decimal" required value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
          <label>Reps<input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="8" /></label>
          <label>Sets<input inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} placeholder="3" /></label>
          <label>Date<input type="date" required value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <button className="btn primary">Save set</button>
      </form>

      <ChartCard title="Top weight per session" subtitle={unit} data={chart} series={[{ key: 'weight', name: `Weight (${unit})`, color: COLORS.volt }]} defaultZoom />

      <section className="panel">
        <header className="panel-head"><h3>History</h3></header>
        {logs.length === 0 ? <div className="empty">No sets yet. Log your first one above.</div> : (
          <ul className="rows">
            {[...logs].reverse().map((l) => (
              <li key={l.id}>
                <div><b>{show(l.weight)} {unit} × {l.reps} reps × {l.sets} sets {prIds.has(l.id) && <span className="chip gold-chip"><Trophy size={12} /> PR</span>}</b><small>{fmtDate(l.date)}</small></div>
                <button className="icon-btn" aria-label="Delete set" onClick={() => confirm('Delete this set?') && del('logs', l.id)}><Trash2 size={17} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
