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
- `users/{uid}/exercises/{id}`: name, archived
- `users/{uid}/logs/{id}`: exerciseId, exerciseName, weight (kg), reps, sets, date
- `users/{uid}/inbody/{id}`: date, weight, muscle, fatMass, fatPct, visceral, bmr, note, image (compressed data URL)
- `users/{uid}/checkins/{date}`: doc id is the date (YYYY-MM-DD); existence means the user marked that day as a gym day
- `users/{uid}/schedule/{id}`: name, weekday (0=Sunday..6, or null for a custom day), exerciseIds (ordered array)

Rules: `firestore.rules`. Users can only read and write their own subtree. Rules are published manually in the Firebase console.

## Conventions
- All weights are stored in **kg**. Convert for display only, using `show()` and `toKg()` from `AppContext`.
- Dates are stored as `YYYY-MM-DD` strings.
- Progress % = (start - current) / (start - target), clamped 0-100. It works for weight loss and gain.
- A PR is a log whose weight beats all earlier logs for that exercise (`computePRs` in `src/utils.js`).
- Weeks start on **Sunday** (`weekStart` in `src/utils.js`).
- A gym day = a day with a logged lift OR a manual check-in. The weekly goal = number of days in the Plan (schedule); with no plan it falls back to `weeklyGoal` (default `WEEK_GOAL` in `src/utils.js`). Week streak counts weeks that reach the goal.
- Home shows a Sun-Sat check-in row (Done / Missed / Today) and today's planned exercises from the schedule.
- InBody images are compressed client-side and stored in the Firestore doc to stay on the free Spark plan (no Firebase Storage).

## Design system
- Colors (CSS variables in `:root`): slate base, ember orange `#FF6A2B` for effort, volt blue `#43D9F0` for data, gold `#FFC53D` for PRs.
- Fonts: Big Shoulders Display (headings and numbers), Figtree (body).
- Signature element: the barbell-style `PlateBar` progress bar.
- Mobile-first: bottom tab bar under 860px. Keep tap targets at least 44px.

## Project layout
- `src/AppContext.jsx`: auth, profile, unit helpers, Firestore helpers, `useCol()` hook
- `src/pages/`: Dashboard, Body, Exercises, ExerciseDetail, Schedule, InBody, Charts, Settings, Login
- `src/components/`: Layout, PlateBar, ChartCard, Modal
- `src/utils.js`: formulas and shared constants

## Roadmap
1. Crew + leaderboard (opt-in sharing, fair % improvement ranking, new shared collection)
2. Challenges and badges
3. Progress photos
4. Arabic / RTL support (English only for now)
