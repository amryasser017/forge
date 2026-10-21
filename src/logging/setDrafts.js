// Half-typed set values survive closing the sheet (kept for the session, per exercise).
const KEY = 'forge.setDrafts';
let mem = null;
const load = () => {
  if (mem) return mem;
  try { mem = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch { mem = {}; }
  return mem;
};
export const getDraft = (id) => load()[id] ?? null;
export function setDraft(id, v) {
  const m = load();
  if (v == null) delete m[id]; else m[id] = v;
  try { sessionStorage.setItem(KEY, JSON.stringify(m)); } catch { /* storage unavailable */ }
}
