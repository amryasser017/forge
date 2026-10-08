export const CHALLENGE_METRICS = {
  workout_sessions: { label: 'Workout sessions', unit: 'sessions', maxTarget: 14 },
  food_log_days: { label: 'Complete food-log days', unit: 'days', maxTarget: 31 },
  water_days: { label: 'Water-target days', unit: 'days', maxTarget: 31 },
  measurements: { label: 'Body measurements logged', unit: 'entries', maxTarget: 10 },
  personal_records: { label: 'Personal records', unit: 'PRs', maxTarget: 10 },
  checkins: { label: 'Daily check-ins', unit: 'check-ins', maxTarget: 31 },
} as const;
export type ChallengeMetric = keyof typeof CHALLENGE_METRICS;
export const METRIC_KEYS = Object.keys(CHALLENGE_METRICS) as ChallengeMetric[];

export type ChallengeScope = 'individual' | 'team' | 'battle';

export function progressPct(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
}
export const isComplete = (progress: number, target: number) => target > 0 && progress >= target;

export interface ChallengeDraft {
  title: string;
  description: string;
  scope: ChallengeScope;
  metric: ChallengeMetric;
  target: number;
  startsOn: string;
  endsOn: string;
  xpReward: number;
}

/**
 * Safety rules for every challenge (manual, default or AI-suggested): only the metrics above exist, so nothing can
 * reward heavier lifting, dehydration, training volume, or weight loss. Targets are capped and windows are 1–31 days.
 */
export function validateChallengeDraft(d: ChallengeDraft): string | null {
  const meta = CHALLENGE_METRICS[d.metric];
  if (!meta) return 'Unknown challenge type';
  if (!Number.isInteger(d.target) || d.target < 1) return 'Target must be a positive whole number';
  if (d.target > meta.maxTarget) return `Target is capped at ${meta.maxTarget} ${meta.unit} to keep it safe and realistic`;
  if (d.endsOn < d.startsOn) return 'End date must be after the start date';
  const days = (Date.parse(d.endsOn) - Date.parse(d.startsOn)) / 86_400_000 + 1;
  if (days > 31) return 'Challenges can run for at most 31 days';
  if (d.target > days && d.metric !== 'workout_sessions' && d.metric !== 'measurements' && d.metric !== 'personal_records') return 'Target cannot be higher than the number of days';
  if (d.xpReward < 0 || d.xpReward > 500) return 'XP reward must be between 0 and 500';
  return null;
}

/** Winner of a head-to-head battle once it ended. Ties return null. */
export function battleWinner(a: { memberId: string; progress: number }, b: { memberId: string; progress: number }): string | null {
  if (a.progress === b.progress) return null;
  return a.progress > b.progress ? a.memberId : b.memberId;
}
