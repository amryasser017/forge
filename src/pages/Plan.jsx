import { useMemo, useState } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { useApp, useCol } from '../AppContext';
import DayCard from '../components/plan/DayCard';
import PlanPicker from '../components/plan/PlanPicker';
import TemplatesModal from '../components/plan/TemplatesModal';
import { useExerciseLibrary } from '../lib/exerciseData';
import { groupLogs } from '../lib/exerciseViews';
import { DAYS, dayKeyOf, planGoal } from '../lib/plan';
import { usePlanActions } from '../lib/usePlanActions';
import { useExerciseSheet } from '../components/exercise/useExerciseSheet';

export default function Plan() {
  const { profile, saveProfile } = useApp();
  const { plan, update, addExercise, applyTemplate } = usePlanActions();
  const docs = useCol('exercises').items;
  const logs = useCol('logs').items;
  const schedule = useCol('schedule').items;
  const { data, byId } = useExerciseLibrary();
  const { open: openSheet, sheet } = useExerciseSheet();
  const today = dayKeyOf();
  const [open, setOpen] = useState(() => new Set([today]));
  const [adding, setAdding] = useState(null); // day key
  const [templates, setTemplates] = useState(false);

  const docsById = useMemo(() => Object.fromEntries(docs.map((d) => [d.id, d])), [docs]);
  const logsBy = useMemo(() => groupLogs(logs), [logs]);
  const flip = (k) => setOpen((o) => { const n = new Set(o); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const goal = planGoal(plan);
  const unplaced = schedule.filter((s) => s.weekday == null).length;

  return (
    <div className="page">
      <div className="title-row">
        <h1 className="page-title">Weekly plan</h1>
        <button className="btn ghost" onClick={() => setTemplates(true)}><LayoutTemplate size={16} /> Starter plans</button>
      </div>
      <p className="muted">
        {goal > 0 ? `${goal} training day${goal === 1 ? '' : 's'} a week. That is your weekly gym goal.` : 'Build your week: open a day and add exercises, or start from a ready-made plan. The same plan repeats every week.'}
      </p>
      {unplaced > 0 && !profile?.hideUnplaced && (
        <div className="panel notice">
          <span>{unplaced} custom day{unplaced === 1 ? '' : 's'} from your old plan had no weekday, so {unplaced === 1 ? 'it was' : 'they were'} not placed here. {unplaced === 1 ? 'It is' : 'They are'} still saved.</span>
          <button className="btn ghost" onClick={() => saveProfile({ hideUnplaced: true })}>Got it</button>
        </div>
      )}

      <div className="sched-list">
        {DAYS.map((d) => (
          <DayCard
            key={d.key} info={d} day={plan[d.key]} isToday={d.key === today}
            open={open.has(d.key)} onToggle={() => flip(d.key)}
            docsById={docsById} libById={byId} logsBy={logsBy}
            onChange={(day) => update(d.key, () => day)}
            onAdd={() => setAdding(d.key)}
            onOpenItem={(doc, it) => openSheet(doc, { tab: 'progress', targetSets: it.targetSets })}
          />
        ))}
      </div>

      {sheet}
      {adding && <PlanPicker info={DAYS.find((d) => d.key === adding)} day={plan[adding]} onAdd={(v, s, r) => addExercise(adding, v, s, r)} onClose={() => setAdding(null)} />}
      {templates && <TemplatesModal plan={plan} libData={data} onApply={applyTemplate} onClose={() => setTemplates(false)} />}
    </div>
  );
}
