import { Link } from 'react-router-dom';
import { Flame, Trophy } from 'lucide-react';
import { useApp, useCol } from '../AppContext';
import PlateBar from '../components/PlateBar';
import { WEEK_GOAL, byDate, computePRs, fmtDate, progressPct, r1, todayStr, weekStart, weekStreak, ymd } from '../utils';

function message(p) {
  if (p == null) return 'Set your goal and start the climb.';
  if (p >= 100) return 'Goal smashed. Time to set the next one.';
  if (p >= 75) return 'Final stretch. Finish what you started.';
  if (p >= 50) return 'Past halfway. Do not ease off now.';
  if (p >= 25) return 'Momentum is building. Keep stacking days.';
  if (p > 0) return 'You are moving. Every rep counts.';
  return 'Day one. Log your first weigh-in and go.';
}

export default function Dashboard() {
  const { profile, show, unit } = useApp();
  const weights = useCol('weights').items;
  const logs = useCol('logs').items;
  const inbody = useCol('inbody').items;

  const sortedW = [...weights].sort(byDate);
  const current = sortedW.length ? sortedW[sortedW.length - 1].value : profile.startWeight;
  const pct = progressPct(profile.startWeight, current, profile.targetWeight);
  const hasGoal = profile.startWeight != null && profile.targetWeight != null;
  const toGo = hasGoal && current != null ? Math.abs(current - profile.targetWeight) : null;
  const losing = hasGoal && profile.startWeight > profile.targetWeight;

  const dates = logs.map((l) => l.date);
  const thisWeek = weekStart(todayStr());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(thisWeek + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return ymd(d);
  });
  const trained = new Set(dates);
  const daysThisWeek = weekDays.filter((d) => trained.has(d)).length;
  const streak = weekStreak(dates);

  const prIds = computePRs(logs);
  const recentPRs = logs.filter((l) => prIds.has(l.id)).sort(byDate).reverse().slice(0, 5);

  const ib = [...inbody].sort(byDate);
  const last = ib[ib.length - 1];
  const prev = ib[ib.length - 2];
  const muscleDelta = last && prev && last.muscle != null && prev.muscle != null ? last.muscle - prev.muscle : null;
  const fatDelta = last && prev && last.fatMass != null && prev.fatMass != null ? last.fatMass - prev.fatMass : null;
  const delta = (v) => (v == null ? '–' : `${v > 0 ? '+' : ''}${r1(unit === 'kg' ? v : v / 0.45359237)} ${unit}`);

  return (
    <div className="page">
      <h1 className="page-title">Hey {profile.name}, let's work.</h1>

      <section className="panel hero">
        <div className="hero-top">
          <div>
            <div className="big">{pct == null ? '—' : Math.round(pct)}<span>%</span></div>
            <p className="hero-msg">{message(pct)}</p>
          </div>
          {toGo != null && (
            <div className="togo">
              <b>{show(toGo)}</b> {unit}
              <small>{pct >= 100 ? 'past target' : losing ? 'left to lose' : 'left to gain'}</small>
            </div>
          )}
        </div>
        {hasGoal ? (
          <PlateBar pct={pct} start={show(profile.startWeight)} current={show(current)} target={show(profile.targetWeight)} unit={unit} />
        ) : (
          <div className="empty">
            Add your start and target weight to turn this into a live progress bar.{' '}
            <Link to="/body" className="link">Set my goal</Link>
          </div>
        )}
      </section>

      <div className="stats">
        <div className="stat">
          <small>Gym days this week</small>
          <b>{daysThisWeek}<em>/{WEEK_GOAL}</em></b>
          <div className="dots">
            {weekDays.map((d) => <i key={d} className={trained.has(d) ? 'on' : ''} title={d} />)}
          </div>
        </div>
        <div className="stat">
          <small>Week streak</small>
          <b><Flame size={22} className="ember" /> {streak}</b>
          <p className="muted">{WEEK_GOAL}+ gym days each week</p>
        </div>
        <div className="stat">
          <small>Muscle since last InBody</small>
          <b className={muscleDelta > 0 ? 'up' : muscleDelta < 0 ? 'down' : ''}>{delta(muscleDelta)}</b>
          <p className="muted">{last ? fmtDate(last.date) : 'No report yet'}</p>
        </div>
        <div className="stat">
          <small>Body fat since last InBody</small>
          <b className={fatDelta < 0 ? 'up' : fatDelta > 0 ? 'down' : ''}>{delta(fatDelta)}</b>
          <p className="muted">Lower is better</p>
        </div>
      </div>

      <div className="two">
        <section className="panel">
          <header className="panel-head"><h3>Recent PRs</h3><Link to="/exercises" className="link">All lifts</Link></header>
          {recentPRs.length === 0 ? (
            <div className="empty">Beat your best weight on any lift and it shows up here.</div>
          ) : (
            <ul className="rows">
              {recentPRs.map((l) => (
                <li key={l.id}>
                  <Trophy size={18} className="gold" />
                  <div><b>{l.exerciseName}</b><small>{fmtDate(l.date)}</small></div>
                  <span className="val">{show(l.weight)} {unit} × {l.reps}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel">
          <header className="panel-head"><h3>Latest InBody</h3><Link to="/inbody" className="link">Open</Link></header>
          {!last ? (
            <div className="empty">Add your first InBody report to track muscle and fat over time.</div>
          ) : (
            <ul className="rows">
              <li><div><b>Skeletal muscle</b><small>{fmtDate(last.date)}</small></div><span className="val">{last.muscle != null ? `${show(last.muscle)} ${unit}` : '–'}</span></li>
              <li><div><b>Body fat</b></div><span className="val">{last.fatPct != null ? `${last.fatPct}%` : '–'}</span></li>
              <li><div><b>Weight</b></div><span className="val">{last.weight != null ? `${show(last.weight)} ${unit}` : '–'}</span></li>
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
