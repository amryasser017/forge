// Starter templates. Exercises are dataset names (see src/data/exercises.json); [name, sets, reps] sets the targets.
// Days are listed in display order: Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday. null = rest day.
const day = (label, focus, picks) => ({ label, focus, picks });

const PUSH = day('Push', ['chest', 'shoulders', 'triceps'], [
  ['Barbell Bench Press - Medium Grip', 4, 8], ['Incline Dumbbell Press', 3, 10], ['Standing Military Press', 3, 8],
  ['Side Lateral Raise', 3, 12], ['Triceps Pushdown', 3, 12], ['EZ-Bar Skullcrusher', 3, 10],
]);
const PULL = day('Pull', ['lats', 'middle back', 'biceps'], [
  ['Pullups', 3, 8], ['Wide-Grip Lat Pulldown', 3, 10], ['Seated Cable Rows', 3, 10], ['Bent Over Barbell Row', 3, 8],
  ['Face Pull', 3, 15], ['Barbell Curl', 3, 10], ['Hammer Curls', 3, 12],
]);
const LEGS = day('Legs', ['quadriceps', 'hamstrings', 'calves'], [
  ['Barbell Squat', 4, 8], ['Leg Press', 3, 10], ['Romanian Deadlift', 3, 10], ['Leg Extensions', 3, 12],
  ['Lying Leg Curls', 3, 12], ['Standing Calf Raises', 4, 15],
]);
const UPPER = day('Upper', ['chest', 'lats', 'shoulders', 'biceps', 'triceps'], [
  ['Barbell Bench Press - Medium Grip', 4, 8], ['Wide-Grip Lat Pulldown', 3, 10], ['Standing Military Press', 3, 8],
  ['Seated Cable Rows', 3, 10], ['Barbell Curl', 3, 10], ['Triceps Pushdown', 3, 12],
]);
const LOWER = day('Lower', ['quadriceps', 'hamstrings', 'glutes', 'calves'], [
  ['Barbell Squat', 4, 8], ['Romanian Deadlift', 3, 10], ['Leg Press', 3, 10], ['Lying Leg Curls', 3, 12],
  ['Standing Calf Raises', 4, 15], ['Crunches', 3, 15],
]);
const FULL_A = day('Full body A', ['quadriceps', 'chest', 'middle back'], [
  ['Barbell Squat', 3, 8], ['Barbell Bench Press - Medium Grip', 3, 8], ['Bent Over Barbell Row', 3, 8], ['Standing Military Press', 3, 10], ['Crunches', 3, 15],
]);
const FULL_B = day('Full body B', ['hamstrings', 'chest', 'lats'], [
  ['Romanian Deadlift', 3, 8], ['Incline Dumbbell Press', 3, 10], ['Wide-Grip Lat Pulldown', 3, 10], ['Side Lateral Raise', 3, 12], ['Barbell Curl', 3, 10], ['Triceps Pushdown', 3, 12],
]);
const FULL_C = day('Full body C', ['quadriceps', 'chest', 'middle back'], [
  ['Leg Press', 3, 10], ['Dumbbell Bench Press', 3, 10], ['Seated Cable Rows', 3, 10], ['Face Pull', 3, 15], ['Hammer Curls', 3, 12], ['Crunches', 3, 15],
]);
const CHEST = day('Chest', ['chest', 'triceps'], [
  ['Barbell Bench Press - Medium Grip', 4, 8], ['Incline Dumbbell Press', 3, 10], ['Butterfly', 3, 12], ['Cable Crossover', 3, 12], ['Triceps Pushdown', 3, 12],
]);
const BACK = day('Back', ['lats', 'middle back', 'biceps'], [
  ['Pullups', 3, 8], ['Wide-Grip Lat Pulldown', 3, 10], ['Bent Over Barbell Row', 3, 8], ['Seated Cable Rows', 3, 10], ['Barbell Curl', 3, 10],
]);
const SHOULDERS = day('Shoulders', ['shoulders', 'traps'], [
  ['Standing Military Press', 4, 8], ['Side Lateral Raise', 4, 12], ['Front Dumbbell Raise', 3, 12], ['Cable Rear Delt Fly', 3, 12], ['Barbell Shrug', 3, 12],
]);
const ARMS = day('Arms', ['biceps', 'triceps', 'forearms'], [
  ['Barbell Curl', 3, 10], ['Triceps Pushdown', 3, 12], ['Hammer Curls', 3, 12], ['EZ-Bar Skullcrusher', 3, 10], ['Preacher Curl', 3, 10],
]);
const LEG_DAY = day('Legs', ['quadriceps', 'hamstrings', 'calves'], [
  ['Barbell Squat', 4, 8], ['Leg Press', 3, 10], ['Leg Extensions', 3, 12], ['Lying Leg Curls', 3, 12], ['Standing Calf Raises', 4, 15],
]);

export const TEMPLATES = [
  { key: 'ppl', name: 'Push / Pull / Legs', blurb: '6 days: push, pull, legs, twice a week.', week: [PUSH, PULL, LEGS, PUSH, PULL, LEGS, null] },
  { key: 'upper-lower', name: 'Upper / Lower', blurb: '4 days: two upper and two lower sessions.', week: [UPPER, LOWER, null, UPPER, LOWER, null, null] },
  { key: 'full-body', name: 'Full Body (3 days)', blurb: '3 days: whole body, with rest days between.', week: [FULL_A, null, FULL_B, null, FULL_C, null, null] },
  { key: 'bro', name: 'Bro split', blurb: '5 days: chest, back, shoulders, arms, legs.', week: [CHEST, BACK, SHOULDERS, ARMS, LEG_DAY, null, null] },
];

/** Dataset names used by a template (for tests and for resolving ids). */
export const templateNames = (t) => [...new Set(t.week.flatMap((d) => (d ? d.picks.map((p) => p[0]) : [])))];
