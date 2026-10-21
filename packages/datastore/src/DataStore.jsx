// Data Store (C2): the only code that talks to Cloud Firestore. All paths are under users/{uid}.
// The signed-in uid is injected by the shell (<DataStoreProvider uid=...>), so this component does not depend on Identity.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const Ctx = createContext(null);

/** IDataStore operations: add, put, merge, ensureDoc, upd, del (sub-collections) and watchRoot, createRoot, mergeRoot (the users/{uid} document). */
export function makeDataStore(uid) {
  const col = (name) => collection(db, 'users', uid, name);
  const ref = (name, id) => doc(db, 'users', uid, name, id);
  const root = () => doc(db, 'users', uid);
  return {
    uid,
    add: (name, data) => addDoc(col(name), { ...data, createdAt: serverTimestamp() }),
    put: (name, id, data) => setDoc(ref(name, id), { ...data, createdAt: serverTimestamp() }),
    /** Merge fields into a doc by id (creates it if missing). */
    merge: (name, id, data) => setDoc(ref(name, id), data, { merge: true }),
    /** Create a doc with a fixed id only if it does not exist yet; never overwrites an existing doc. */
    ensureDoc: async (name, id, data) => {
      const r = ref(name, id);
      if (!(await getDoc(r)).exists()) await setDoc(r, { ...data, createdAt: serverTimestamp() });
      return id;
    },
    upd: (name, id, data) => updateDoc(ref(name, id), data),
    del: (name, id) => deleteDoc(ref(name, id)),
    /** Live users/{uid} document: onData(data) when it exists, onMissing() when it does not. Returns the unsubscribe function. */
    watchRoot: (onData, onMissing) => onSnapshot(root(), (snap) => (snap.exists() ? onData(snap.data()) : onMissing())),
    createRoot: (data) => setDoc(root(), { ...data, createdAt: serverTimestamp() }),
    mergeRoot: (data) => setDoc(root(), data, { merge: true }),
  };
}

export function DataStoreProvider({ uid, children }) {
  const store = useMemo(() => makeDataStore(uid), [uid]);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
export const useDataStore = () => useContext(Ctx);

/** Live list of documents in users/{uid}/{name}: { items, loading }. */
export function useCol(name) {
  const { uid } = useDataStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) return undefined;
    return onSnapshot(collection(db, 'users', uid, name), (s) => {
      setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [uid, name]);
  return { items, loading };
}
