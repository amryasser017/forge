// Muscle folders for the exercise library. Keys are the muscle names used by the dataset, so an exercise
// lives in the folder of its FIRST primary muscle. Order = display order.
export const FOLDERS = [
  { key: 'chest', label: 'Chest', emoji: '🏋️' },
  { key: 'shoulders', label: 'Shoulders', emoji: '🙌' },
  { key: 'biceps', label: 'Biceps', emoji: '💪' },
  { key: 'triceps', label: 'Triceps', emoji: '🦾' },
  { key: 'forearms', label: 'Forearms', emoji: '✊' },
  { key: 'lats', label: 'Lats', emoji: '🦅' },
  { key: 'middle back', label: 'Middle back', emoji: '🐢' },
  { key: 'traps', label: 'Traps', emoji: '🏔️' },
  { key: 'lower back', label: 'Lower back', emoji: '🧍' },
  { key: 'abdominals', label: 'Abdominals', emoji: '🍫' },
  { key: 'quadriceps', label: 'Quadriceps', emoji: '🦵' },
  { key: 'hamstrings', label: 'Hamstrings', emoji: '🍗' },
  { key: 'glutes', label: 'Glutes', emoji: '🍑' },
  { key: 'calves', label: 'Calves', emoji: '🦶' },
  { key: 'adductors', label: 'Adductors', emoji: '↔️' },
  { key: 'abductors', label: 'Abductors', emoji: '↔️' },
  { key: 'neck', label: 'Neck', emoji: '🦒' },
];

export const FOLDER_BY_KEY = Object.fromEntries(FOLDERS.map((f) => [f.key, f]));
export const CUSTOM_FOLDER = { key: 'custom', label: 'My custom', emoji: '🛠️' };

/** Folder key of a dataset exercise: its first primary muscle. */
export const folderKeyOf = (ex) => ex.primaryMuscles?.[0] ?? 'other';

/** Display name for any muscle key from the dataset (primary or secondary). */
export const muscleLabel = (key) => FOLDER_BY_KEY[key]?.label ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : '');

// Equipment chips (dataset values are grouped into six simple filters).
export const EQUIPMENT_GROUPS = ['Machine', 'Cable', 'Barbell', 'Dumbbell', 'Bodyweight', 'Other'];
export function equipmentGroup(eq) {
  switch (eq) {
    case 'machine': return 'Machine';
    case 'cable': return 'Cable';
    case 'barbell':
    case 'e-z curl bar': return 'Barbell';
    case 'dumbbell': return 'Dumbbell';
    case 'body only': return 'Bodyweight';
    default: return 'Other';
  }
}
export const MECHANIC_LABEL = { compound: 'Compound', isolation: 'Isolation' };
