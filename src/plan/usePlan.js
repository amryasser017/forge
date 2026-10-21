import { useEffect, useMemo } from 'react';
import { useCol, useDataStore } from '@forge/datastore';
import { useProfile } from '@forge/identity';
import { useExerciseDocs } from '../library/useExerciseDocs';
import { DAY_KEYS, migrateSchedule, planFromDocs } from './plan';

let migrating = false;

/**
 * The weekly plan ({ sat..fri: day }). On first use it converts the old "schedule" into the plan once
 * (profile.planMigrated); the old schedule docs are left untouched.
 */
export function usePlan() {
  const store = useDataStore();
  const { profile, saveProfile } = useProfile();
  const planCol = useCol('plan');
  const scheduleCol = useCol('schedule');
  const exCol = useExerciseDocs();
  const plan = useMemo(() => planFromDocs(planCol.items), [planCol.items]);

  useEffect(() => {
    if (planCol.loading || scheduleCol.loading || exCol.loading) return;
    if (planCol.items.length > 0 || profile?.planMigrated || scheduleCol.items.length === 0 || migrating) return;
    migrating = true;
    const { plan: migrated } = migrateSchedule(scheduleCol.items, new Set(exCol.items.map((d) => d.id)));
    Promise.all(DAY_KEYS.map((k) => store.merge('plan', k, migrated[k])))
      .then(() => saveProfile({ planMigrated: true }))
      .finally(() => { migrating = false; });
  }, [planCol.loading, scheduleCol.loading, exCol.loading, planCol.items.length, scheduleCol.items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return { plan, loading: planCol.loading, unplacedDays: scheduleCol.items.filter((s) => s.weekday == null) };
}
