// Identity (C1), part 1: the Firebase session. user is undefined while loading, null when signed out.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '@forge/datastore';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  const value = useMemo(() => ({ user, signOut: () => fbSignOut(auth) }), [user]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
/** IAuth: { user, signOut }. Sign in and sign up live in Login.jsx. */
export const useAuth = () => useContext(Ctx);
