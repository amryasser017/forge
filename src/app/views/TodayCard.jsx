import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useExerciseDocs } from '../../library/useExerciseDocs';
import { useLogs } from '../../logging/useLogs';
import ExerciseImage from '../../library/components/ExerciseImage';
import { useExerciseSheet } from './useExerciseSheet';
import Glance from '../../progress/Glance';
import Sheet from '../../ui/Sheet';
import { FOLDER_BY_KEY } from '../../library/data/muscleFolders';
import { libDocId, useExerciseLibrary } from '../../library/exerciseData';
import { searchIndex } from '../../library/exerciseSearch';
import { groupLogs, recentExerciseIds } from '../../logging/logReader';
import { dayKeyOf, planHasItems } from '../../plan/plan';
import { usePlan } from '../../plan/usePlan';
import { setsOn } from '../../logging/logReader';
import { todayStr } from '../../shared/dates';

function Thumb({ lib, doc }) {
  return lib ? <ExerciseImage ex={lib} className="ex-thumb sm" /> : <span className="ex-img ex-thumb sm ex-img-empty" aria-hidden>{FOLDER_BY_KEY[doc?.folderKey]?.emoji ?? '🛠️'}</span>;
}

/** Pick any exercise (recent first, then search) to log something outside today's plan. */
function AnyExercisePicker({ docs, byId, index, logs, onPick, onClose }) {
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const recents = useMemo(() => recentExerciseIds(logs, 6).map((id) => docs.find((d) => d.id === id)).filter((d) => d && !d.archived), [logs, docs]);
  const results = useMemo(() => (dq.trim() && index ? searchIndex(index, dq, { limit: 20 }) : []), [index, dq]);
  const pickLib = (e) => onPick(docs.find((d) => d.id === libDocId(e.id)) ?? { id: libDocId(e.id), name: e.name, libId: e.id, virtual: true });
  return (
    <Sheet title="Log something else" onClose={onClose}>
      <label className="search"><Search size={18} aria-hidden /><input type="search" placeholder="Search all exercises" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search all exercises" /></label>
      {!dq.trim() && recents.length > 0 && <h4 className="mini-title">Recent</h4>}
      <ul className="pick-list">
        {!dq.trim() && recents.map((d) => (
          <li key={d.id}><button type="button" className="pick-main" onClick={() => onPick(d)}><Thumb lib={d.libId ? byId[d.libId] : null} doc={d} /><span className="pick-text"><b>{d.name}</b></span></button></li>
        ))}
        {results.map((r) => { const e = r.ex ?? r; return (
          <li key={e.id}><button type="button" className="pick-main" onClick={() => pickLib(e)}><Thumb lib={e} /><span className="pick-text"><b>{e.name}</b></span></button></li>
        ); })}
      </ul>
      {dq.trim() && results.length === 0 && <div className="empty">No match. Try another name.</div>}
      {!dq.trim() && recents.length === 0 && <div className="empty">Type an exercise name to find it.</div>}
    </Sheet>
  );
}

/** Home: today's planned exercises, opening the exercise sheet on the Log tab. */
export default function TodayCard() {
  const { plan } = usePlan();
  const docs = useExerciseDocs().items;
  const logs = useLogs().items;
  const { byId, index } = useExerciseLibrary();
  const { open, sheet } = useExerciseSheet();
  const [other, setOther] = useState(false);
  const day = plan[dayKeyOf()];
  const by = useMemo(() => groupLogs(logs), [logs]);
  const today = todayStr();
  const items = day.items.map((it) => ({ it, doc: docs.find((d) => d.id === it.exerciseId) })).filter((x) => x.doc && !x.doc.archived);
  const hasPlan = planHasItems(plan);

  return (
    <section className="panel" aria-label="Today">
      <header className="panel-head"><h3>Today{day.label ? ` · ${day.label}` : ''}</h3><Link to="/schedule" className="link">{hasPlan ? 'Edit plan' : 'Build my week'}</Link></header>
      {day.rest ? <div className="empty">Rest day. Recovery is part of the plan.</div>
        : items.length === 0 ? <div className="empty">{hasPlan ? 'Nothing planned for today.' : 'No plan yet, build your week.'}</div>
        : (
          <ul className="today-list">
            {items.map(({ it, doc }) => {
              const done = setsOn(by[doc.id] ?? [], today);
              return (
                <li key={doc.id}>
                  <button type="button" className="plan-item-main" onClick={() => open(doc, { tab: 'log', targetSets: it.targetSets })} aria-label={`Log ${doc.name}`}>
                    <Thumb lib={doc.libId ? byId[doc.libId] : null} doc={doc} />
                    <span className="plan-item-text"><b>{doc.name}</b><Glance logs={by[doc.id]} /></span>
                    <span className={'today-count' + (done >= it.targetSets ? ' ok' : '')}>{done}/{it.targetSets}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      <button type="button" className="link-btn" onClick={() => setOther(true)}>Do something else today</button>
      {other && <AnyExercisePicker docs={docs} byId={byId} index={index} logs={logs} onClose={() => setOther(false)} onPick={(ex) => { setOther(false); open(ex, { tab: 'log' }); }} />}
      {sheet}
    </section>
  );
}
