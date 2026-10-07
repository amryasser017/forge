import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { KG_PER_LB, r1 } from './utils';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [profile, setProfile] = useState(null);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); if (!u) setProfile(null); }), []);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) setProfile(snap.data());
      else
        setDoc(ref, {
          name: user.displayName || (user.email || 'Athlete').split('@')[0],
          unit: 'kg',
          startWeight: null,
          targetWeight: null,
          targetDate: '',
          createdAt: serverTimestamp(),
        });
    });
  }, [user]);

  const value = useMemo(() => {
    const unit = profile?.unit || 'kg';
    const show = (kg) => (kg == null || kg === '' ? '' : unit === 'kg' ? r1(kg) : r1(kg / KG_PER_LB));
    const toKg = (v) => {
      const n = parseFloat(v);
      if (Number.isNaN(n)) return null;
      return Math.round((unit === 'kg' ? n : n * KG_PER_LB) * 100) / 100;
    };
    const uid = user?.uid;
    const api = {
      add: (name, data) => addDoc(collection(db, 'users', uid, name), { ...data, createdAt: serverTimestamp() }),
      upd: (name, id, data) => updateDoc(doc(db, 'users', uid, name, id), data),
      del: (name, id) => deleteDoc(doc(db, 'users', uid, name, id)),
      saveProfile: (data) => setDoc(doc(db, 'users', uid), data, { merge: true }),
    };
    return { user, profile, unit, show, toKg, ...api };
  }, [user, profile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Live list of documents in users/{uid}/{name}. */
export function useCol(name) {
  const { user } = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'users', user.uid, name), (s) => {
      setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [user, name]);
  return { items, loading };
}
