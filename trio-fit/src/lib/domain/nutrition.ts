export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}
export const ZERO_MACROS: Macros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
export function sumMacros(items: Partial<Macros>[]): Macros {
  const t = items.reduce<Macros>(
    (a, i) => ({ calories: a.calories + n(i.calories), proteinG: a.proteinG + n(i.proteinG), carbsG: a.carbsG + n(i.carbsG), fatG: a.fatG + n(i.fatG), fiberG: a.fiberG + n(i.fiberG) }),
    { ...ZERO_MACROS },
  );
  return { calories: Math.round(t.calories), proteinG: r1(t.proteinG), carbsG: r1(t.carbsG), fatG: r1(t.fatG), fiberG: r1(t.fiberG) };
}
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Scale per-100 g nutrition to a portion in grams. */
export function macrosForGrams(per100g: Partial<Macros>, grams: number): Macros {
  const f = grams / 100;
  return { calories: Math.round(n(per100g.calories) * f), proteinG: r1(n(per100g.proteinG) * f), carbsG: r1(n(per100g.carbsG) * f), fatG: r1(n(per100g.fatG) * f), fiberG: r1(n(per100g.fiberG) * f) };
}

/** 0..100+ (not clamped above so over-target is visible). Null when no target. */
export function percentOfTarget(value: number, target: number | null | undefined): number | null {
  if (!target || target <= 0) return null;
  return Math.round((value / target) * 100);
}

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];
