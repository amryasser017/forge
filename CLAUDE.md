# Forge: Gym Tracker

Personal gym tracking web app for a small group of friends. Each user has a private space with their own data. A crew leaderboard comes later (not built yet).

## Stack
- React 18 + Vite (plain JS, no TypeScript, plain CSS in `src/styles.css`)
- Firebase Auth (email/password + Google) and Firestore
- Recharts for charts, lucide-react for icons
- Deployed on Vercel (auto-deploys on every push to `main`)

## Commands
- `npm install`: install dependencies
- `npm run dev`: local dev server (http://localhost:5173)
- `npm run build`: production build (run this before pushing to catch errors)

## Environment
Firebase keys live in `.env` (never commit it). Variable names are in `.env.example`, all prefixed `VITE_FIREBASE_`. The same variables are set in Vercel project settings.

## Data model (Firestore)
Everything is under `users/{uid}` so rules stay simple:
- `users/{uid}`: name, unit (kg|lb), startWeight, targetWeight, targetDate, weeklyGoal (gym days/week, default 3)
- `users/{uid}/weights/{id}`: value (kg), date (YYYY-MM-DD)
- `users/{uid}/exercises/{id}`: name, archived, favorite. Library exercises use the deterministic id `lib_<datasetId>` with `libId` (created lazily on first favorite / log / add-to-plan via `ensureLibExercise`); custom ones may have `custom`, `folderKey`, `equipment`
- `users/{uid}/logs/{id}`: exerciseId, exerciseName, weight (kg), reps, sets, date
- `users/{uid}/inbody/{id}`: date, weight, muscle, fatMass, fatPct, visceral, bmr, note, image (compressed data URL)
- `users/{uid}/checkins/{date}`: doc id is the date (YYYY-MM-DD); existence means the user marked that day as a gym day
- `users/{uid}/folders/{id}`: name, exerciseIds (array of exercise doc ids; an exercise can be in several folders; exercises in no folder show under "Not in a folder")
- `users/{uid}/schedule/{id}`: name, weekday (0=Sunday..6, or null for a custom day), exerciseIds (ordered array)
- `users/{uid}/plan/{sat|sun|mon|tue|wed|thu|fri}`: label, rest, focus (array of muscle folder keys), items (ordered `{exerciseId, targetSets, targetReps, note}`). Replaces `schedule`: the old `schedule` docs are migrated once (profile flag `planMigrated`) and left untouched; `hideUnplaced` hides the notice about custom days without a weekday

Rules: `firestore.rules`. Users can only read and write their own subtree. Rules are published manually in the Firebase console.

## Conventions
- All weights are stored in **kg**. Convert for display only, using `show()` and `toKg()` from `AppContext`.
- Dates are stored as `YYYY-MM-DD` strings.
- Progress % = (start - current) / (start - target), clamped 0-100. It works for weight loss and gain.
- A PR is a log whose weight beats all earlier logs for that exercise (`computePRs` in `src/utils.js`).
- Weeks start on **Saturday** (`weekStart` in `src/utils.js`). Weekday numbers stored in data are still JS `getDay()` (0 = Sunday); `WEEK_ORDER` is the display order.
- A gym day = a day with a logged lift OR a manual check-in. The weekly goal = number of days in the Plan (schedule); with no plan it falls back to `weeklyGoal` (default `WEEK_GOAL` in `src/utils.js`). Week streak counts weeks that reach the goal.
- Exercise library: 584 strength exercises from the public-domain Free Exercise DB (`src/data/exercises.json`, lazy-loaded; rebuild with `npm run build:exercises`). Images load from jsDelivr with a raw.githubusercontent fallback. Lifts is organised in 17 muscle folders with emoji (`src/data/muscleFolders.js`) plus "My custom"; search, popular list (`src/data/popular.js`), equipment filter and favorites. Video = only a "Watch how-to" YouTube search link (`videos.json` stays `{}`). Do not show estimated 1RM in new UI.
- Weekly plan (`/schedule`, page `Plan`): 7 day cards Saturday→Friday; weekly goal = number of non-rest days with items. Tapping an exercise opens `ExerciseSheet` (Progress / How to / Log tabs; Plan opens Progress, Home Today opens Log). Log tab writes `logs` docs (one set each, sets:1) with steppers, sets-done counter and optional rest timer; typed values are kept per exercise in sessionStorage (`setDrafts`). Home has a `TodayCard` with "Do something else today"; the Log tab offers "Add to today's plan" for off-plan exercises.
- Week editing (pure functions in `src/lib/plan.js`, tested): Shift week (by N days, wraps around), Move / Swap / Copy a whole day, Clear day (keeps label, focus, rest), all through `usePlanActions().apply(nextPlan)` which writes only changed days. Every such change (and removing one exercise) shows an Undo toast that restores the previous plan.
- Tests: `npm test` (vitest, `tests/`).
- (older) My lifts is organised in folders (collapsed by default). "Add exercise" inside a folder either picks existing exercises or creates a new one; deleting a folder never deletes exercises or logs.
- Home shows a Sat-Fri check-in row (Done / Missed / Today) and today's planned exercises from the schedule.
- InBody images are compressed client-side and stored in the Firestore doc to stay on the free Spark plan (no Firebase Storage).

## Design system
- Colors (CSS variables in `:root`): slate base, ember orange `#FF6A2B` for effort, volt blue `#43D9F0` for data, gold `#FFC53D` for PRs.
- Fonts: Big Shoulders Display (headings and numbers), Figtree (body).
- Signature element: the barbell-style `PlateBar` progress bar.
- Mobile-first: bottom tab bar under 860px. Keep tap targets at least 44px.

## Project layout
- `src/AppContext.jsx`: auth, profile, unit helpers, Firestore helpers, `useCol()` hook
- `src/pages/`: Dashboard, Body, Exercises, ExerciseDetail, Plan, InBody, Charts, Settings, Login
- `src/components/`: Layout, PlateBar, ChartCard, Modal, Sheet, Stepper, `exercise/` (ExerciseSheet, LogTab, HowTo, ProgressPanel, ...), `plan/` (DayCard, PlanPicker, TodayCard, ...)
- `src/lib/`: exercise search/data/stats/views, `plan.js`, `usePlan`, `usePlanActions`, `setDrafts`, `useFocusTrap`
- `src/utils.js`: formulas and shared constants

## Roadmap
1. Crew + leaderboard (opt-in sharing, fair % improvement ranking, new shared collection)
2. Challenges and badges
3. Progress photos
4. Arabic / RTL support (English only for now)

## TRIO FIT (separate app in `trio-fit/`)
A second, private app for AMR / AMAN / SHADY lives in the `trio-fit/` folder (Next.js 15 + TypeScript + Supabase). It does not
share code with Forge and deploys as its own Vercel project with Root Directory `trio-fit`. Read `trio-fit/README.md` before
changing it. Key rules: all DB access is server-side with the service-role key (RLS denies everything else); the member id comes
from the session cookie only; rewards go through `award_xp()` with a unique `event_key`; calculations live in
`trio-fit/src/lib/domain` and must stay unit-tested (`cd trio-fit && npm run check`).
