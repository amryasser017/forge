import { useMemo, useRef } from 'react';
import { useApp, useCol } from '../AppContext';
import { DAY_KEYS, addItem, dayChanged, emptyDay } from './plan';
import { ensureLibExercise, libDocId } from '../library/exerciseData';
import { usePlan } from './usePlan';

/** Plan editing helpers. Reads the latest plan from a ref so quick successive edits don't overwrite each other. */
export function usePlanActions() {
  const app = useApp();
  const { plan } = usePlan();
  const docs = useCol('exercises').items;
  const planRef = useRef(plan);
  planRef.current = plan;
  const docsRef = useRef(docs);
  docsRef.current = docs;

  return useMemo(() => {
    const save = async (key, day) => {
      planRef.current = { ...planRef.current, [key]: day };
      await app.merge('plan', key, day);
    };
    return {
      plan,
      save,
      /** Replace several days at once with a full { sat..fri } plan; only the days that differ are written. */
      async apply(next) {
        const before = planRef.current;
        const changed = DAY_KEYS.filter((k) => dayChanged(before[k], next[k]));
        if (changed.length === 0) return;
        planRef.current = { ...before, ...Object.fromEntries(changed.map((k) => [k, next[k]])) };
        try {
          await Promise.all(changed.map((k) => app.merge('plan', k, next[k])));
        } catch (e) {
          planRef.current = before;
          throw e;
        }
      },
      /** Change a day with fn(day) -> day. */
      update: (key, fn) => save(key, fn(planRef.current[key])),
      /** v = a view from exerciseViews (library or custom). Library docs are created on first use. */
      async addExercise(key, v, sets, reps) {
        if (v.lib && !docsRef.current.some((d) => d.id === v.docId)) await ensureLibExercise(app, v.lib);
        await save(key, addItem(planRef.current[key], v.docId, sets, reps));
      },
      /** Replace the whole week with a template. libData = the dataset array. */
      async applyTemplate(template, libData) {
        const byName = new Map(libData.map((x) => [x.name, x]));
        const libs = new Map();
        const days = template.week.map((d) => {
          if (!d) return { ...emptyDay(), rest: true };
          const items = d.picks.flatMap(([name, sets, reps]) => {
            const ex = byName.get(name);
            if (!ex) return [];
            libs.set(ex.id, ex);
            return [{ exerciseId: libDocId(ex.id), targetSets: sets, targetReps: reps, note: '' }];
          });
          return { label: d.label, rest: false, focus: d.focus, items };
        });
        await Promise.all([...libs.values()].map((ex) => (docsRef.current.some((d) => d.id === libDocId(ex.id)) ? null : ensureLibExercise(app, ex))));
        await Promise.all(DAY_KEYS.map((k, i) => save(k, days[i])));
      },
    };
  }, [app, plan]);
}
