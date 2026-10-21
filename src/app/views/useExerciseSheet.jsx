import { useCallback, useState } from 'react';
import { useExerciseLibrary } from '../../library/exerciseData';
import ExerciseSheet from './ExerciseSheet';

/** `open(ex, {tab, targetSets})` shows the sheet; render `sheet` once in the page. */
export function useExerciseSheet() {
  const { byId } = useExerciseLibrary();
  const [st, setSt] = useState(null);
  const open = useCallback((ex, opts = {}) => setSt({ ex, ...opts }), []);
  const sheet = st && <ExerciseSheet key={st.ex.id} ex={st.ex} libEx={st.ex.libId ? byId[st.ex.libId] : null} tab={st.tab} targetSets={st.targetSets} onClose={() => setSt(null)} />;
  return { open, sheet };
}
