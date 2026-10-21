import { useMemo } from 'react';
import { useCol, useDataStore } from '@forge/datastore';
import { useProfile } from '@forge/identity';
import { planGoal } from '../plan/plan';
import { attendanceSummary, weeklyGoal } from './attendance';

/**
 * IAttendance for the Home view. `plan` (from IPlan) and `logs` (from ILogReader) are passed in by the view.
 * Returns the goal, this week's days, counts, streak, and toggleDay(date) to check a day in or undo it.
 */
export function useAttendance({ plan, logs }) {
  const { profile } = useProfile();
  const { put, del } = useDataStore();
  const checkins = useCol('checkins').items;
  const goal = weeklyGoal(planGoal(plan), profile.weeklyGoal);
  const summary = useMemo(
    () => attendanceSummary({ logDates: logs.map((l) => l.date), checkinIds: checkins.map((c) => c.id), goal }),
    [logs, checkins, goal],
  );
  const toggleDay = (d) => (summary.checked.has(d) ? del('checkins', d) : put('checkins', d, { date: d }));
  return { goal, toggleDay, ...summary };
}
