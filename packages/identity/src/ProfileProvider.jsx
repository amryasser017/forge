// Identity (C1), part 2: the profile document users/{uid}. Needs IDataStore, so it is mounted inside <DataStoreProvider>.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useDataStore } from '@forge/datastore';

const Ctx = createContext(null);

/** First sign-in: name from the account (or the email prefix), unit kg, empty weight goal. */
export const defaultProfile = (user) => ({
  name: user.displayName || (user.email || 'Athlete').split('@')[0],
  unit: 'kg',
  startWeight: null,
  targetWeight: null,
  targetDate: '',
});

/** Renders `fallback` until the profile has loaded (and creates it when it does not exist yet). */
export function ProfileProvider({ user, fallback = null, children }) {
  const store = useDataStore();
  const [profile, setProfile] = useState(null);
  useEffect(() => store.watchRoot(setProfile, () => store.createRoot(defaultProfile(user))), [store, user]);
  const value = useMemo(() => ({ profile, saveProfile: (data) => store.mergeRoot(data) }), [profile, store]);
  if (!profile) return fallback;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
/** IProfile: { profile, saveProfile(partial) }. */
export const useProfile = () => useContext(Ctx);
