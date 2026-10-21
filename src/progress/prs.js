// Personal records and estimated 1RM (Progress & Analytics, C5).
import { byDate } from '../shared/dates';

/** Epley estimated one-rep max. */
export const epley = (w, reps) => (reps > 1 ? w * (1 + reps / 30) : w);

/** Returns a Set of log ids that beat the previous best weight for that exercise. */
export function computePRs(logs) {
  const best = {};
  const prs = new Set();
  [...logs].sort(byDate).forEach((l) => {
    const b = best[l.exerciseId];
    if (b === undefined) best[l.exerciseId] = l.weight;
    else if (l.weight > b) {
      prs.add(l.id);
      best[l.exerciseId] = l.weight;
    }
  });
  return prs;
}
