// Gives components show/toKg/unit for the athlete's chosen unit (IUnits). The shell passes the unit in.
import { createContext, useContext, useMemo } from 'react';
import { makeUnits } from './units';

const Ctx = createContext(makeUnits('kg'));
export function UnitsProvider({ unit, children }) {
  const value = useMemo(() => makeUnits(unit), [unit]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
/** IUnits: { unit, show(kg), toKg(value) }. */
export const useUnits = () => useContext(Ctx);
