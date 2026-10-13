// Builds src/data/exercises.json and src/data/popular.js from the open "Free Exercise DB"
// (https://github.com/yuhonas/free-exercise-db, public domain).
//
//   node scripts/build-exercise-data.mjs [path/to/exercises.json]
//
// Without an argument the dataset is downloaded from GitHub. The script prints a report of every
// popular exercise name that could not be matched so the lists below can be fixed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const FIELDS = ['id', 'name', 'force', 'level', 'mechanic', 'equipment', 'primaryMuscles', 'secondaryMuscles', 'instructions', 'images'];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Popular exercises. `want` is the well-known name; `use` lists the dataset names it maps to when the
// dataset calls it something else (or has several good variants). Without `use`, `want` is fuzzy-matched.
const POPULAR = [
  // Chest
  { want: 'Barbell Bench Press', use: ['Barbell Bench Press - Medium Grip', 'Wide-Grip Barbell Bench Press', 'Decline Barbell Bench Press', 'Barbell Incline Bench Press - Medium Grip'] },
  { want: 'Incline Dumbbell Press', use: ['Incline Dumbbell Press'] },
  { want: 'Dumbbell Bench Press', use: ['Dumbbell Bench Press', 'Decline Dumbbell Bench Press'] },
  { want: 'Machine Chest Press', use: ['Machine Bench Press', 'Smith Machine Bench Press'] },
  { want: 'Cable Crossover', use: ['Cable Crossover', 'Low Cable Crossover'] },
  { want: 'Pec Deck', use: ['Butterfly'] },
  { want: 'Push-Up', use: ['Pushups', 'Push-Up Wide', 'Decline Push-Up', 'Incline Push-Up'] },
  { want: 'Chest Dip', use: ['Dips - Chest Version'] },
  { want: 'Dumbbell Flyes', use: ['Dumbbell Flyes', 'Incline Dumbbell Flyes'] },
  // Back
  { want: 'Lat Pulldown', use: ['Wide-Grip Lat Pulldown', 'V-Bar Pulldown', 'Close-Grip Front Lat Pulldown', 'Underhand Cable Pulldowns'] },
  { want: 'Pull-Up', use: ['Pullups', 'Weighted Pull Ups', 'Band Assisted Pull-Up'] },
  { want: 'Chin-Up', use: ['Chin-Up'] },
  { want: 'Seated Cable Row', use: ['Seated Cable Rows'] },
  { want: 'Barbell Row', use: ['Bent Over Barbell Row', 'Reverse Grip Bent-Over Rows'] },
  { want: 'One-Arm Dumbbell Row', use: ['One-Arm Dumbbell Row', 'Bent Over Two-Dumbbell Row'] },
  { want: 'T-Bar Row', use: ['Lying T-Bar Row'] },
  { want: 'Straight-Arm Pulldown', use: ['Straight-Arm Pulldown'] },
  { want: 'Deadlift', use: ['Barbell Deadlift', 'Trap Bar Deadlift'] },
  { want: 'Back Extension', use: ['Hyperextensions (Back Extensions)'] },
  // Shoulders
  { want: 'Overhead Press (barbell)', use: ['Standing Military Press', 'Seated Barbell Military Press'] },
  { want: 'Overhead Press (dumbbell)', use: ['Dumbbell Shoulder Press', 'Arnold Dumbbell Press', 'Seated Dumbbell Press'] },
  { want: 'Machine Shoulder Press', use: ['Machine Shoulder (Military) Press'] },
  { want: 'Lateral Raise', use: ['Side Lateral Raise', 'Seated Side Lateral Raise', 'Cable Seated Lateral Raise'] },
  { want: 'Rear Delt Fly', use: ['Cable Rear Delt Fly', 'Seated Bent-Over Rear Delt Raise', 'Reverse Flyes'] },
  { want: 'Face Pull', use: ['Face Pull'] },
  { want: 'Front Raise', use: ['Front Dumbbell Raise', 'Front Cable Raise'] },
  { want: 'Shrug', use: ['Barbell Shrug', 'Dumbbell Shrug', 'Cable Shrugs'] },
  { want: 'Upright Row', use: ['Upright Barbell Row'] },
  // Biceps
  { want: 'Barbell Curl', use: ['Barbell Curl', 'EZ-Bar Curl'] },
  { want: 'Dumbbell Curl', use: ['Dumbbell Bicep Curl', 'Seated Dumbbell Curl'] },
  { want: 'Hammer Curl', use: ['Hammer Curls', 'Alternate Hammer Curl', 'Cable Hammer Curls - Rope Attachment'] },
  { want: 'Preacher Curl', use: ['Preacher Curl', 'Cable Preacher Curl', 'Machine Preacher Curls'] },
  { want: 'Cable Curl', use: ['Standing Biceps Cable Curl', 'High Cable Curls'] },
  { want: 'Incline Dumbbell Curl', use: ['Incline Dumbbell Curl'] },
  { want: 'Concentration Curl', use: ['Concentration Curls'] },
  // Triceps
  { want: 'Triceps Pushdown', use: ['Triceps Pushdown', 'Triceps Pushdown - Rope Attachment', 'Triceps Pushdown - V-Bar Attachment', 'Reverse Grip Triceps Pushdown'] },
  { want: 'Overhead Triceps Extension', use: ['Triceps Overhead Extension with Rope', 'Standing Dumbbell Triceps Extension'] },
  { want: 'Skull Crusher', use: ['EZ-Bar Skullcrusher', 'Lying Dumbbell Tricep Extension'] },
  { want: 'Close-Grip Bench Press', use: ['Close-Grip Barbell Bench Press'] },
  { want: 'Bench Dip', use: ['Bench Dips', 'Dips - Triceps Version'] },
  { want: 'Triceps Kickback', use: ['Tricep Dumbbell Kickback'] },
  { want: 'Machine Triceps Extension', use: ['Machine Triceps Extension', 'Cable One Arm Tricep Extension'] },
  // Legs & glutes
  { want: 'Squat', use: ['Barbell Squat', 'Barbell Full Squat', 'Goblet Squat', 'Dumbbell Squat'] },
  { want: 'Leg Press', use: ['Leg Press', 'Narrow Stance Leg Press'] },
  { want: 'Leg Extension', use: ['Leg Extensions'] },
  { want: 'Leg Curl', use: ['Lying Leg Curls', 'Seated Leg Curl', 'Standing Leg Curl'] },
  { want: 'Romanian Deadlift', use: ['Romanian Deadlift', 'Stiff-Legged Barbell Deadlift'] },
  { want: 'Lunge', use: ['Dumbbell Lunges', 'Barbell Lunge', 'Barbell Walking Lunge', 'Dumbbell Rear Lunge'] },
  { want: 'Bulgarian Split Squat', use: ['Split Squat with Dumbbells', 'Single Leg Squat'] },
  { want: 'Hack Squat', use: ['Hack Squat', 'Barbell Hack Squat'] },
  { want: 'Standing Calf Raise', use: ['Standing Calf Raises', 'Smith Machine Calf Raise'] },
  { want: 'Seated Calf Raise', use: ['Seated Calf Raise'] },
  { want: 'Hip Thrust', use: ['Single Leg Glute Bridge', 'Barbell Glute Bridge', 'Barbell Hip Thrust'] },
  { want: 'Hip Adductor machine', use: ['Thigh Adductor'] },
  { want: 'Hip Abductor machine', use: ['Thigh Abductor'] },
  { want: 'Glute Kickback', use: ['Glute Kickback'] },
  // Forearms
  { want: 'Wrist Curl', use: ['Seated Palm-Up Barbell Wrist Curl', 'Seated Dumbbell Palms-Up Wrist Curl', 'Palms-Down Wrist Curl Over A Bench', 'Cable Wrist Curl'] },
  // Core
  { want: 'Plank', use: ['Plank'] },
  { want: 'Crunch', use: ['Crunches', 'Reverse Crunch'] },
  { want: 'Cable Crunch', use: ['Cable Crunch'] },
  { want: 'Hanging Leg Raise', use: ['Hanging Leg Raise'] },
  { want: 'Russian Twist', use: ['Russian Twist'] },
  { want: 'Ab Wheel', use: ['Ab Roller'] },
  { want: 'Ab Crunch Machine', use: ['Ab Crunch Machine'] },
];

const raw = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : await (await fetch(SOURCE)).text();
const all = JSON.parse(raw);
const strength = all.filter((x) => x.category === 'strength');

const bad = strength.filter((x) => !/^[A-Za-z0-9_-]+$/.test(x.id));
if (bad.length) console.warn(`WARNING: ${bad.length} ids contain characters that are unsafe in Firestore doc ids:`, bad.slice(0, 5).map((x) => x.id));

const data = strength.map((x) => Object.fromEntries(FIELDS.map((k) => [k, x[k] ?? (Array.isArray(x[k]) ? [] : null)])));
const byName = new Map(data.map((x) => [norm(x.name), x]));

const ids = [];
const report = [];
const missing = [];
for (const p of POPULAR) {
  const found = [];
  for (const n of p.use ?? []) {
    const hit = byName.get(norm(n));
    if (hit) found.push(hit);
  }
  if (found.length === 0) {
    // fuzzy fallback: every word of the wanted name appears in the dataset name, shortest name wins
    const words = norm(p.want).split(' ');
    const fuzzy = data.filter((x) => words.every((w) => norm(x.name).includes(w))).sort((a, b) => a.name.length - b.name.length)[0];
    if (fuzzy) found.push(fuzzy);
  }
  if (found.length === 0) missing.push(p.want);
  else {
    report.push(`${p.want}  ->  ${found.map((f) => f.name).join(' | ')}`);
    found.forEach((f) => !ids.includes(f.id) && ids.push(f.id));
  }
  const notUsed = (p.use ?? []).filter((n) => !byName.get(norm(n)));
  if (notUsed.length && found.length) report.push(`   (not in dataset, skipped: ${notUsed.join(', ')})`);
}

mkdirSync(join(root, 'src/data'), { recursive: true });
writeFileSync(join(root, 'src/data/exercises.json'), JSON.stringify(data));
writeFileSync(
  join(root, 'src/data/popular.js'),
  `// GENERATED by scripts/build-exercise-data.mjs - edit the POPULAR list there, then re-run it.\n` +
    `// Dataset ids of the curated "popular" exercises (${ids.length}).\n` +
    `export const POPULAR_IDS = ${JSON.stringify(ids)};\n` +
    `export const POPULAR_SET = new Set(POPULAR_IDS);\n`
);

console.log(`exercises: ${data.length} strength (of ${all.length}) -> src/data/exercises.json (${(JSON.stringify(data).length / 1024).toFixed(0)} KB)`);
console.log(`popular: ${ids.length} exercises from ${POPULAR.length} entries`);
console.log('\nMATCH REPORT\n' + report.join('\n'));
console.log('\nNOT FOUND (' + missing.length + '): ' + (missing.join(', ') || 'none'));
