import { useMemo, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, LayoutTemplate } from 'lucide-react';
import { useExerciseDocs } from '../../library/useExerciseDocs';
import { useLogs } from '../../logging/useLogs';
import { useProfile } from '@forge/identity';
import { UndoToast } from '@forge/ui';
import DayCard from '../../plan/components/DayCard';
import PlanPicker from '../../plan/components/PlanPicker';
import TemplatesModal from '../../plan/components/TemplatesModal';
import DayPickerSheet from '../../plan/components/DayPickerSheet';
import ShiftWeekSheet from '../../plan/components/ShiftWeekSheet';
import { useExerciseLibrary } from '../../library/exerciseData';
import { groupLogs, recentExerciseIds } from '../../logging/logReader';
import { DAYS, clearDay, copyDay, dayKeyOf, moveDay, planGoal, shiftWeek, swapDays } from '../../plan/plan';
import { usePlan } from '../../plan/usePlan';
import { usePlanActions } from '../../plan/usePlanActions';
import { useExerciseSheet } from './useExerciseSheet';

export default function Plan() {
  const { profile, saveProfile } = useProfile();
  const { plan, update, apply, addExercise, applyTemplate } = usePlanActions();
  const docs = useExerciseDocs().items;
  const logs = useLogs().items;
  const { unplacedDays } = usePlan();
  const { data, byId } = useExerciseLibrary();
  const { open: openSheet, sheet } = useExerciseSheet();
  const today = dayKeyOf();
  const [open, setOpen] = useState(() => new Set([today]));
  const [adding, setAdding] = useState(null); // day key
  const [templates, setTemplates] = useState(false);
  const [shifting, setShifting] = useState(false);
  const [picking, setPicking] = useState(null); // { kind: 'swap'|'move'|'copy', from }
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');

  // Applies a whole new week and offers Undo, which puts the previous week back.
  const change = async (next, text) => {
    const prev = plan;
    setError('');
    try {
      await apply(next);
      setToast({ id: Date.now(), text, onUndo: () => apply(prev).catch(() => setError('Could not undo. Check your connection and try again.')) });
    } catch {
      setError('Could not save the change. Check your connection and try again.');
    }
  };
  const dayName = (k) => DAYS.find((d) => d.key === k).name;
  const onDayAction = (key, kind) => {
    if (kind === 'clear') {
      const n = plan[key].items.length;
      change({ ...plan, [key]: clearDay(plan[key]) }, `Cleared ${n} exercise${n === 1 ? '' : 's'} from ${dayName(key)}`);
    } else setPicking({ kind, from: key });
  };
  const pickDay = (to) => {
    const { kind, from } = picking;
    setPicking(null);
    if (kind === 'swap') change(swapDays(plan, from, to), `Swapped ${dayName(from)} and ${dayName(to)}`);
    else if (kind === 'move') change(moveDay(plan, from, to), `Moved ${dayName(from)} to ${dayName(to)}`);
    else change(copyDay(plan, from, to), `Copied ${dayName(from)} to ${dayName(to)}`);
    setOpen((o) => new Set([...o, to]));
  };
  const onChangeDay = (key, day) => {
    // Removing an exercise can be undone too.
    if (day.items.length < plan[key].items.length) change({ ...plan, [key]: day }, 'Exercise removed');
    else update(key, () => day);
  };

  const docsById = useMemo(() => Object.fromEntries(docs.map((d) => [d.id, d])), [docs]);
  const logsBy = useMemo(() => groupLogs(logs), [logs]);
  const flip = (k) => setOpen((o) => { const n = new Set(o); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const goal = planGoal(plan);
  const planHasItemsAny = (p) => DAYS.some((d) => p[d.key].items.length > 0 || p[d.key].rest);
  const unplaced = unplacedDays.length;
  const hasAnyDay = planHasItemsAny(plan);
  const shiftText = (n) => `Moved the whole week ${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} ${n > 0 ? 'later' : 'earlier'}`;
  const quickShift = (n) => change(shiftWeek(plan, n), shiftText(n));

  return (
    <div className="page">
      <div className="title-row">
        <h1 className="page-title">Weekly plan</h1>
        <div className="seg-row">
          <button className="btn ghost" onClick={() => setTemplates(true)}><LayoutTemplate size={16} /> Starter plans</button>
        </div>
      </div>
      <p className="muted">
        {goal > 0 ? `${goal} training day${goal === 1 ? '' : 's'} a week. That is your weekly gym goal.` : 'Build your week: open a day and add exercises, or start from a ready-made plan. The same plan repeats every week.'}
      </p>
      <section className="panel week-move" aria-label="Move the whole week">
        <div>
          <b>Move the whole week</b>
          <small className="muted">All days move together (Saturday's workout becomes Sunday's). You can undo.</small>
        </div>
        <div className="week-move-btns">
          <button type="button" className="btn ghost" onClick={() => quickShift(-1)} disabled={!hasAnyDay}><ChevronLeft size={18} /> A day earlier</button>
          <button type="button" className="btn ghost" onClick={() => quickShift(1)} disabled={!hasAnyDay}>A day later <ChevronRight size={18} /></button>
          <button type="button" className="btn ghost" onClick={() => setShifting(true)} disabled={!hasAnyDay}><CalendarClock size={16} /> More days…</button>
        </div>
      </section>
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
            onChange={(day) => onChangeDay(d.key, day)}
            onDayAction={(kind) => onDayAction(d.key, kind)}
            onAdd={() => setAdding(d.key)}
            onOpenItem={(doc, it) => openSheet(doc, { tab: 'progress', targetSets: it.targetSets })}
          />
        ))}
      </div>

      {sheet}
      {error && <div className="panel notice" role="alert"><span>{error}</span></div>}
      {shifting && <ShiftWeekSheet plan={plan} onClose={() => setShifting(false)} onApply={(n) => { setShifting(false); change(shiftWeek(plan, n), shiftText(n)); }} />}
      {picking && <DayPickerSheet kind={picking.kind} from={picking.from} plan={plan} onPick={pickDay} onClose={() => setPicking(null)} />}
      <UndoToast toast={toast} onDismiss={() => setToast(null)} />
      {adding && <PlanPicker info={DAYS.find((d) => d.key === adding)} day={plan[adding]} docs={docs} recentIds={recentExerciseIds(logs, 6)} onAdd={(v, s, r) => addExercise(adding, v, s, r)} onClose={() => setAdding(null)} />}
      {templates && <TemplatesModal plan={plan} libData={data} onApply={applyTemplate} onClose={() => setTemplates(false)} />}
    </div>
  );
}
