import { useEffect, useMemo, useState } from 'react';
import { POPULAR_SET } from './data/popular';
import { buildIndex } from './exerciseSearch';

let loading;
/** Lazy-load the 600 KB exercise file so it never weighs on the main bundle. */
export function loadExercises() {
  loading ??= import('./data/exercises.json').then((m) => m.default);
  return loading;
}

/** { data, index, byId, error } - data is null until the file has loaded. */
export function useExerciseLibrary() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    loadExercises().then((d) => alive && setData(d)).catch(() => alive && setError(true));
    return () => { alive = false; };
  }, []);
  return useMemo(() => {
    if (!data) return { data: null, index: null, byId: {}, error };
    return { data, index: buildIndex(data, POPULAR_SET), byId: Object.fromEntries(data.map((x) => [x.id, x])), error };
  }, [data, error]);
}

// Firestore doc ids of library exercises are deterministic: lib_<datasetId>
export const libDocId = (datasetId) => `lib_${datasetId}`;
export const datasetIdOf = (docId) => (docId && docId.startsWith('lib_') ? docId.slice(4) : null);

// Images come from the jsDelivr CDN with raw.githubusercontent.com as a fallback.
const CDN = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';
const RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
export function imageUrls(ex, i = 0) {
  const path = ex?.images?.[i];
  return path ? [CDN + path, RAW + path] : [];
}

/** Create the user's own doc for a library exercise the first time it is needed (idempotent, never overwrites). */
export function ensureLibExercise(store, libEx) {
  return store.ensureDoc('exercises', libDocId(libEx.id), { name: libEx.name, libId: libEx.id, favorite: false, archived: false });
}
