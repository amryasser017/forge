export interface XpRules {
  workout: number;
  foodLogComplete: number;
  waterTarget: number;
  measurement: number;
  personalRecord: number;
  weeklyChallenge: number;
  teamChallenge: number;
  /** coins earned per 10 XP (cosmetic currency only). */
  coinsPer10Xp: number;
}

export const DEFAULT_XP_RULES: XpRules = {
  workout: 100,
  foodLogComplete: 40,
  waterTarget: 20,
  measurement: 25,
  personalRecord: 50,
  weeklyChallenge: 100,
  teamChallenge: 75,
  coinsPer10Xp: 1,
};

export const XP_RULE_LABELS: Record<keyof XpRules, string> = {
  workout: 'Completed workout (once per day)',
  foodLogComplete: 'Complete & honest daily food log',
  waterTarget: 'Daily water target',
  measurement: 'New body measurement (once per day)',
  personalRecord: 'Personal record bonus',
  weeklyChallenge: 'Completed individual challenge',
  teamChallenge: 'Completed team challenge bonus',
  coinsPer10Xp: 'Coins per 10 XP',
};

/** Merge stored overrides with defaults, ignoring invalid values. */
export function resolveRules(stored: unknown): XpRules {
  const out = { ...DEFAULT_XP_RULES };
  if (stored && typeof stored === 'object') {
    for (const k of Object.keys(out) as (keyof XpRules)[]) {
      const v = (stored as Record<string, unknown>)[k];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10_000) out[k] = Math.round(v);
    }
  }
  return out;
}

/**
 * Level curve: leaving level L costs 100 + 50·(L−1) XP, so every level is harder than the last.
 * Cumulative XP needed to REACH level L (level 1 = 0 XP): 100(L−1) + 25(L−1)(L−2).
 */
export const costOfLevel = (level: number) => 100 + 50 * (level - 1);
export const xpToReachLevel = (level: number) => (level <= 1 ? 0 : 100 * (level - 1) + 25 * (level - 1) * (level - 2));

export interface LevelInfo {
  level: number;
  title: string;
  totalXp: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number; // 0..1
}

export const LEVEL_TITLES = ['Rookie', 'Fitness Explorer', 'Gym Regular', 'Iron Apprentice', 'Form Builder', 'Power Mover', 'Consistency Knight', 'Iron Veteran', 'Peak Performer', 'Trio Legend'] as const;
export const levelTitle = (level: number) => LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 2))] as string;

export function levelFromXp(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpToReachLevel(level + 1) <= total) level += 1;
  const base = xpToReachLevel(level);
  const xpForNext = costOfLevel(level);
  const xpIntoLevel = total - base;
  return { level, title: levelTitle(level), totalXp: total, xpIntoLevel, xpForNext, progress: Math.min(1, xpIntoLevel / xpForNext) };
}

export const coinsForXp = (xp: number, rules: XpRules) => Math.floor((xp / 10) * rules.coinsPer10Xp);
