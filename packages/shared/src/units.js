// kg <-> lb conversion (Shared Kernel, C10). Everything is stored in kg; convert only for display and input.
export const KG_PER_LB = 0.45359237;
export const r1 = (n) => Math.round(n * 10) / 10;

/** show(kg) -> number in the user's unit (1 decimal); toKg(value) -> kg (2 decimals) or null. */
export function makeUnits(unit = 'kg') {
  const show = (kg) => (kg == null || kg === '' ? '' : unit === 'kg' ? r1(kg) : r1(kg / KG_PER_LB));
  const toKg = (v) => {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return null;
    return Math.round((unit === 'kg' ? n : n * KG_PER_LB) * 100) / 100;
  };
  return { unit, show, toKg };
}
