// View models that unify library exercises and the user's own (custom) exercise docs.
import { equipmentGroup, folderKeyOf } from './data/muscleFolders';
import { POPULAR_SET } from './data/popular';

export const libView = (ex, doc) => ({
  key: `lib_${ex.id}`, docId: `lib_${ex.id}`, name: ex.name, lib: ex, group: equipmentGroup(ex.equipment),
  mechanic: ex.mechanic, folder: folderKeyOf(ex), popular: POPULAR_SET.has(ex.id), doc,
});
export const customView = (doc) => ({
  key: doc.id, docId: doc.id, name: doc.name, lib: null, group: doc.equipment || null, mechanic: null,
  folder: doc.folderKey || null, custom: true, doc,
});
/** View of an exercise doc; library docs get their dataset entry (byId may still be empty while it loads). */
export const docView = (doc, byId) => (doc.libId && byId[doc.libId] ? libView(byId[doc.libId], doc) : customView(doc));

/** Ids of the most recently logged exercises, newest first. */
export function recentExerciseIds(logs, n = 6) {
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
  const ids = [];
  for (const l of sorted) {
    if (!ids.includes(l.exerciseId)) ids.push(l.exerciseId);
    if (ids.length >= n) break;
  }
  return ids;
}

/** exerciseId -> logs of that exercise. */
export function groupLogs(logs) {
  const m = {};
  for (const l of logs) (m[l.exerciseId] ??= []).push(l);
  return m;
}
