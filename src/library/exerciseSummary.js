import { muscleLabel } from './data/muscleFolders';

const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const lower = (k) => muscleLabel(k).toLowerCase();

/**
 * One plain sentence built only from the dataset fields, e.g.
 * "A compound pull that mainly works your lats, with help from middle back and biceps."
 */
export function exerciseSummary(ex) {
  const primary = (ex.primaryMuscles || []).map(lower);
  if (primary.length === 0) return null;
  const secondary = (ex.secondaryMuscles || []).map(lower).filter((m) => !primary.includes(m)).slice(0, 3);
  const mech = ex.mechanic === 'compound' || ex.mechanic === 'isolation' ? ex.mechanic : null;
  let what;
  if (ex.force === 'static') what = `${mech ? `${mech} ` : ''}static hold`;
  else if (ex.force === 'push' || ex.force === 'pull') what = `${mech ? `${mech} ` : ''}${ex.force}`;
  else what = mech ? `${mech} exercise` : 'exercise';
  const article = /^[aeiou]/.test(what) ? 'An' : 'A';
  const help = secondary.length ? `, with help from ${list(secondary)}` : '';
  return `${article} ${what} that mainly works your ${list(primary)}${help}.`;
}
