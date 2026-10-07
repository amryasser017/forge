import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp, useCol } from '../AppContext';
import PlateBar from '../components/PlateBar';
import ChartCard from '../components/ChartCard';
import { COLORS, byDate, fmtDate, progressPct, shortDate, todayStr } from '../utils';

export default function Body() {
  const { profile, unit, show, toKg, saveProfile, add, del } = useApp();
  const { items } = useCol('weights');
  const sorted = [...items].sort(byDate);
  const current = sorted.length ? sorted[sorted.length - 1].value : profile.startWeight;
  const pct = progressPct(profile.startWeight, current, profile.targetWeight);

  const [start, setStart] = useState('');
  const [target, setTarget] = useState('');
  const [tdate, setTdate] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setStart(show(profile.startWeight));
    setTarget(show(profile.targetWeight));
    setTdate(profile.targetDate || '');
  }, [profile.startWeight, profile.targetWeight, profile.targetDate, unit]); // eslint-disable-line

  async function saveGoal(e) {
    e.preventDefault();
    await saveProfile({ startWeight: toKg(start), targetWeight: toKg(target), targetDate: tdate });
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  }
  async function addWeight(e) {
    e.preventDefault();
    const kg = toKg(value);
    if (kg == null) return;
    await add('weights', { value: kg, date });
    if (profile.startWeight == null) await saveProfile({ startWeight: kg });
    setValue('');
  }

  const chart = sorted.map((w) => ({ label: shortDate(w.date), weight: show(w.value) }));

  return (
    <div className="page">
      <h1 className="page-title">My body</h1>

      <section className="panel hero">
        <div className="hero-top">
          <div><div className="big">{pct == null ? '—' : Math.round(pct)}<span>%</span></div>
            <p className="hero-msg">{current != null ? `Current weight: ${show(current)} ${unit}` : 'Log your first weigh-in below.'}</p></div>
        </div>
        {profile.startWeight != null && profile.targetWeight != null ? (
          <PlateBar pct={pct} start={show(profile.startWeight)} current={show(current)} target={show(profile.targetWeight)} unit={unit} />
        ) : <div className="empty">Set start and target weight to see your bar.</div>}
      </section>

      <div className="two">
        <form className="panel form" onSubmit={saveGoal}>
          <h3>Goal</h3>
          <div className="grid2">
            <label>Start weight ({unit})<input inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} placeholder="115" /></label>
            <label>Target weight ({unit})<input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="90" /></label>
          </div>
          <label>Target date (optional)<input type="date" value={tdate} onChange={(e) => setTdate(e.target.value)} /></label>
          <button className="btn primary">{saved ? 'Saved' : 'Save goal'}</button>
          <p className="muted">Going down or up, the bar fills as you get closer to your target.</p>
        </form>

        <form className="panel form" onSubmit={addWeight}>
          <h3>Log weigh-in</h3>
          <div className="grid2">
            <label>Weight ({unit})<input inputMode="decimal" required value={value} onChange={(e) => setValue(e.target.value)} placeholder="112.4" /></label>
            <label>Date<input type="date" required value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} /></label>
          </div>
          <button className="btn primary">Add weigh-in</button>
        </form>
      </div>

      <ChartCard title="Weight over time" subtitle={unit} data={chart} series={[{ key: 'weight', name: `Weight (${unit})`, color: COLORS.ember }]} defaultType="line" defaultZoom />

      <section className="panel">
        <header className="panel-head"><h3>History</h3></header>
        {sorted.length === 0 ? <div className="empty">No weigh-ins yet.</div> : (
          <ul className="rows">
            {[...sorted].reverse().map((w) => (
              <li key={w.id}>
                <div><b>{show(w.value)} {unit}</b><small>{fmtDate(w.date)}</small></div>
                <button className="icon-btn" aria-label="Delete weigh-in" onClick={() => confirm('Delete this weigh-in?') && del('weights', w.id)}><Trash2 size={17} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
