export interface BoardEntry {
  memberId: string;
  value: number | null;
}
export interface Ranked extends BoardEntry {
  rank: number | null;
}

/** Competition ranking (1,1,3). Members without a value are listed last and unranked. */
export function rank(entries: BoardEntry[]): Ranked[] {
  const withVal = entries.filter((e) => e.value != null).sort((a, b) => (b.value as number) - (a.value as number));
  const without = entries.filter((e) => e.value == null);
  const out: Ranked[] = [];
  withVal.forEach((e, i) => {
    const prev = out[i - 1];
    out.push({ ...e, rank: prev && prev.value === e.value ? (prev.rank as number) : i + 1 });
  });
  return [...out, ...without.map((e) => ({ ...e, rank: null }))];
}

export const BOARDS = [
  { key: 'xp', title: 'Overall XP', unit: 'XP', how: 'Sum of all XP earned in the period (workouts, logging, PR bonuses, challenges).' },
  { key: 'consistency', title: 'Consistency', unit: '%', how: 'Completed planned workout days ÷ planned workout days in the period. Each member is measured against their own schedule.' },
  { key: 'improvement', title: 'Personal improvement', unit: '%', how: 'For each exercise done at least twice in the period: % change in session volume (weight × reps) from first to latest session, averaged. You only compete against your own earlier sessions.' },
  { key: 'nutrition', title: 'Nutrition logging', unit: '%', how: 'Days marked as a complete, honest food log ÷ days in the period.' },
  { key: 'team', title: 'Team contribution', unit: 'pts', how: 'Progress units you added to active team challenges (e.g. each session toward a "team sessions" goal).' },
] as const;
export type BoardKey = (typeof BOARDS)[number]['key'];

export type Period = 'week' | 'month' | 'all';
