import { Link } from 'react-router-dom';
import { Check, Flame, Trophy, X } from 'lucide-react';
import { useApp, useCol } from '../AppContext';
import PlateBar from '../components/PlateBar';
import { DAY_NAMES, WEEK_GOAL, byDate, computePRs, fmtDate, progressPct, r1, todayStr, weekStart, weekStreak, ymd } from '../utils';

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
  const { profile, show, unit, put, del } = useApp();
  const weights = useCol('weights').items;
  const logs = useCol('logs').items;
  const inbody = useCol('inbody').items;
  const checkins = useCol('checkins').items;
  const schedule = useCol('schedule').items;
  const exercises = useCol('exercises').items;
  // Weekly target = number of days in the plan; falls back to the Settings goal when there is no plan yet.
  const goal = schedule.length || (profile.weeklyGoal ?? WEEK_GOAL);

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
  const logged = new Set(dates);
  const checked = new Set(checkins.map((c) => c.id));
  const trained = new Set([...logged, ...checked]);
  const daysThisWeek = weekDays.filter((d) => trained.has(d)).length;
  const streak = weekStreak([...trained], goal);
  const today = todayStr();
  const toggleDay = (d) => (checked.has(d) ? del('checkins', d) : put('checkins', d, { date: d }));
  const todayPlan = schedule
    .filter((s) => s.weekday === new Date().getDay())
    .map((s) => ({ ...s, ex: (s.exerciseIds || []).map((id) => exercises.find((x) => x.id === id)).filter((x) => x && !x.archived) }));

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
          <b>{daysThisWeek}<em>/{goal}</em></b>
          <div className="dots">
            {weekDays.map((d) => <i key={d} className={trained.has(d) ? 'on' : ''} title={d} />)}
          </div>
        </div>
        <div className="stat">
          <small>Week streak</small>
          <b><Flame size={22} className="ember" /> {streak}</b>
          <p className="muted">Weeks with all {goal} planned days done</p>
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

      <section className="panel">
        <header className="panel-head">
          <h3>This week</h3>
          <small>{daysThisWeek}/{goal} gym days · tap a day to check it off</small>
        </header>
        <div className="week">
          {weekDays.map((d, i) => {
            const done = trained.has(d);
            const locked = logged.has(d) && !checked.has(d);
            const missed = !done && d < today;
            const state = done ? 'done' : missed ? 'missed' : d === today ? 'today' : 'future';
            return (
              <button
                key={d}
                type="button"
                className={'day ' + state}
                disabled={locked || d > today}
                onClick={() => toggleDay(d)}
                title={locked ? 'Done (you logged a lift)' : done ? 'Tap to undo' : 'Tap to mark done'}
              >
                <small>{DAY_NAMES[i].slice(0, 3)}</small>
                <span className="day-ic">{done ? <Check size={20} /> : missed ? <X size={18} /> : <i />}</span>
                <em>{done ? 'Done' : missed ? 'Missed' : d === today ? 'Today' : ''}</em>
              </button>
            );
          })}
        </div>
      </section>

      {todayPlan.length > 0 && (
        <section className="panel">
          <header className="panel-head"><h3>Today's plan</h3><Link to="/schedule" className="link">Edit plan</Link></header>
          {todayPlan.map((s) => (
            <div key={s.id}>
              <b>{s.name}</b>
              {s.ex.length === 0 ? <p className="muted">No exercises added yet.</p> : (
                <ul className="rows">
                  {s.ex.map((x) => (
                    <li key={x.id}><Link to={`/exercises/${x.id}`} className="grow"><b>{x.name}</b></Link><Link to={`/exercises/${x.id}`} className="link">Log</Link></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

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
