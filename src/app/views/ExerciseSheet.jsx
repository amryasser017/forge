import { useState } from 'react';
import { useLogs } from '../../logging/useLogs';
import { Sheet } from '@forge/ui';
import ExerciseMedia from '../../library/components/ExerciseMedia';
import HowTo from '../../library/components/HowTo';
import LogTab from '../../logging/LogTab';
import AddToTodayButton from '../../plan/components/AddToTodayButton';
import { lastLog } from '../../progress/exerciseStats';
import MuscleChips from '../../library/components/MuscleChips';
import ProgressPanel from '../../progress/ProgressPanel';

const TABS = [['progress', 'Progress'], ['howto', 'How to'], ['log', 'Log']];

/**
 * Bottom sheet for one exercise. `ex` is an exercise doc (or a virtual one: { id, name, libId, virtual }).
 * `tab` is the tab to open on: 'log' from Today, 'progress' from the Plan.
 */
export default function ExerciseSheet({ ex, libEx, tab = 'log', targetSets, onClose }) {
  const [active, setActive] = useState(tab);
  const logs = useLogs().items.filter((l) => l.exerciseId === ex.id);
  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div className="tabs" role="tablist" aria-label="Exercise">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" id={`xs-tab-${k}`} aria-selected={active === k} aria-controls="xs-panel" className={'tab' + (active === k ? ' on' : '')} onClick={() => setActive(k)}>{label}</button>
        ))}
      </div>
      <div id="xs-panel" role="tabpanel" aria-labelledby={`xs-tab-${active}`}>
        {active === 'progress' && <ProgressPanel logs={logs} />}
        {active === 'howto' && (libEx ? <><MuscleChips ex={libEx} /><ExerciseMedia ex={libEx} /><HowTo ex={libEx} /></> : <div className="empty">This is your own exercise, so there are no steps or images. Log it from the Log tab.</div>)}
        {active === 'log' && <LogTab ex={ex} libEx={libEx} logs={logs} targetSets={targetSets}><AddToTodayButton ex={ex} libEx={libEx} defaultReps={lastLog(logs)?.reps} /></LogTab>}
      </div>
    </Sheet>
  );
}
