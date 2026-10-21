// Weight-goal progress (Body Tracking, C8).

/** Works for weight loss (start > target) and weight gain (start < target). */
export function progressPct(start, current, target) {
  if ([start, current, target].some((v) => v == null || Number.isNaN(v))) return null;
  if (start === target) return 100;
  const p = ((start - current) / (start - target)) * 100;
  return Math.max(0, Math.min(100, p));
}
