export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** BMI = kg / m^2. Returns null when an input is missing or not positive. BMI is NOT a body-fat measure. */
export function bmi(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!isNum(weightKg) || !isNum(heightCm) || weightKg <= 0 || heightCm <= 0) return null;
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

export function bmiBand(value: number | null): string {
  if (value == null) return '—';
  if (value < 18.5) return 'Below the typical range';
  if (value < 25) return 'Within the typical range';
  if (value < 30) return 'Above the typical range';
  return 'Well above the typical range';
}

/** Fat mass = weight × body-fat% / 100 */
export function fatMassKg(weightKg: number | null | undefined, bodyFatPct: number | null | undefined): number | null {
  if (!isNum(weightKg) || !isNum(bodyFatPct) || weightKg <= 0 || bodyFatPct < 0 || bodyFatPct > 100) return null;
  return round1((weightKg * bodyFatPct) / 100);
}

/** Fat-free mass = weight − fat mass */
export function fatFreeMassKg(weightKg: number | null | undefined, bodyFatPct: number | null | undefined): number | null {
  const fm = fatMassKg(weightKg, bodyFatPct);
  if (fm == null || !isNum(weightKg)) return null;
  return round1(weightKg - fm);
}

/** Percentage change from `from` to `to`. Null when the baseline is missing or zero (never divides by zero). */
export function pctChange(from: number | null | undefined, to: number | null | undefined): number | null {
  if (!isNum(from) || !isNum(to) || from === 0) return null;
  return round1(((to - from) / Math.abs(from)) * 100);
}

export function delta(from: number | null | undefined, to: number | null | undefined): number | null {
  if (!isNum(from) || !isNum(to)) return null;
  return round1(to - from);
}

/**
 * Progress toward a personal target, 0–100. Works for loss (start > target) and gain (start < target).
 * Null when any input is missing.
 */
export function targetProgress(start: number | null | undefined, current: number | null | undefined, target: number | null | undefined): number | null {
  if (!isNum(start) || !isNum(current) || !isNum(target)) return null;
  if (start === target) return 100;
  const p = ((start - current) / (start - target)) * 100;
  return Math.max(0, Math.min(100, round1(p)));
}
