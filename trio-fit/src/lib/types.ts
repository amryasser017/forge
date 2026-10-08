export interface Member {
  id: string;
  slug: 'amr' | 'aman' | 'shady';
  name: string;
  display_name: string;
  avatar_url: string | null;
  workout_days: number[];
  tone: 'hype' | 'calm' | 'funny';
  language: 'ar' | 'en';
  messages_enabled: boolean;
  share_body_stats: boolean;
  theme: 'light' | 'dark';
  equipped_title: string | null;
  equipped_frame: string | null;
}
export interface Goals {
  member_id: string;
  height_cm: number | null;
  start_weight_kg: number | null;
  target_weight_kg: number | null;
  target_body_fat_pct: number | null;
  calorie_target: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  water_target_ml: number;
}
export interface Measurement {
  id: string;
  member_id: string;
  measured_on: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  skeletal_muscle_kg: number | null;
  body_water_kg: number | null;
  visceral_level: number | null;
  bmr_kcal: number | null;
  note: string | null;
  source: string;
}
export interface Exercise {
  id: string;
  slug: string;
  name: string;
  kind: 'resistance' | 'cardio';
  equipment: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string | null;
  safety_notes: string | null;
  image_url: string | null;
  youtube_url: string | null;
  youtube_video_id: string | null;
  youtube_title: string | null;
  youtube_verified_at: string | null;
  youtube_query: string | null;
  is_custom: boolean;
  categories?: string[];
}
export interface SetRow {
  id?: string;
  set_no: number;
  weight_kg: number | null;
  reps: number | null;
  rest_sec: number | null;
}
export interface WorkoutExerciseRow {
  id: string;
  session_id: string;
  exercise_id: string;
  position: number;
  notes: string | null;
  duration_min: number | null;
  distance_km: number | null;
  avg_speed_kmh: number | null;
  incline_pct: number | null;
  exercise_sets: SetRow[];
  exercises?: Pick<Exercise, 'id' | 'slug' | 'name' | 'kind' | 'youtube_query'>;
}
export interface SessionRow {
  id: string;
  member_id: string;
  performed_on: string;
  title: string;
  duration_min: number | null;
  perceived_effort: number | null;
  notes: string | null;
  status: 'draft' | 'completed';
  created_at?: string;
  workout_exercises?: WorkoutExerciseRow[];
}
export interface FoodLog {
  id: string;
  member_id: string;
  eaten_on: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  quantity: number;
  unit: string;
  grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  source: string;
  verified: boolean;
}
export interface CheckIn {
  id: string;
  member_id: string;
  day: string;
  energy: number | null;
  sleep_hours: number | null;
  stress: number | null;
  note: string | null;
  food_log_complete: boolean;
}
export interface Challenge {
  id: string;
  scope: 'individual' | 'team' | 'battle';
  title: string;
  description: string | null;
  metric: string;
  target: number;
  starts_on: string;
  ends_on: string;
  xp_reward: number;
  is_boss: boolean;
  created_by: string | null;
}
export interface Insight {
  id: string;
  member_id: string | null;
  kind: string;
  body: string;
  source: 'ai' | 'rules';
  created_at: string;
}
export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  coin_reward: number;
}
export interface Cosmetic {
  id: string;
  key: string;
  kind: 'title' | 'frame';
  name: string;
  value: string;
  cost_coins: number;
}

/** Returned by every game-affecting action so the UI can celebrate. */
export interface RewardSummary {
  xp: number;
  coins: number;
  levelUp: number | null;
  prs: string[];
  achievements: string[];
  challenges: string[];
  message: string | null;
}
export const EMPTY_REWARD: RewardSummary = { xp: 0, coins: 0, levelUp: null, prs: [], achievements: [], challenges: [], message: null };

/** Standard result shape for server actions used with <ActionForm/>. */
export interface ActionResult {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  reward?: RewardSummary;
  redirectTo?: string;
  data?: unknown;
}
