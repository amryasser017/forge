# Forge: Component Breakdown and Ownership (Step 1)

Target architecture. Every source file, every Firestore collection and every shared helper is owned by exactly one component.
Rules: (R1) one responsibility per component, (R2) one owner per collection, others read/write through the owner's interface,
(R3) dependencies are acyclic, (R4) pages that combine several components are Composition Views and contain no business logic.

## Components

| ID | Component | Responsibility | Owns (collections) | Provided interfaces | Required interfaces |
|---|---|---|---|---|---|
| C1 | Identity & Profile | Sign in/out, session, profile (name, unit, weight goal, weeklyGoal) | `users/{uid}` | IAuth, IProfile | IDataStore |
| C2 | Data Store | The only code that talks to Firestore; live subscriptions | none | IDataStore | (Firebase SDK) |
| C3 | Exercise Library | Dataset, search, muscle folders, media, favorites, custom exercises, user folders | `exercises`, `folders` | IExerciseCatalog, IExerciseSearch | IDataStore, IDates |
| C4 | Workout Logging | Log sets, sets-done counter, rest timer, drafts, history | `logs` | ILogger, ILogReader | IDataStore, IExerciseCatalog, IUnits, IDates |
| C5 | Progress & Analytics | PRs, trends, best weight, charts data | none (derived) | IProgress | ILogReader, IBodyReader, IInBodyReader, IUnits |
| C6 | Weekly Plan | 7-day plan, templates, shift/move/swap/copy/clear, undo, legacy schedule migration | `plan`, `schedule` (legacy, read-only) | IPlan | IDataStore, IExerciseCatalog, IProgress (glance) |
| C7 | Attendance & Goals | Gym days, check-ins, weekly goal, week streak | `checkins` | IAttendance | IDataStore, ILogReader, IPlan, IProfile, IDates |
| C8 | Body Tracking | Weigh-ins, goal progress % | `weights` | IBodyTracker, IBodyReader | IDataStore, IProfile, IUnits |
| C9 | InBody Reports | Reports, metrics, image compression | `inbody` | IInBody, IInBodyReader | IDataStore, IUnits |
| C10 | Units & Dates (Shared Kernel) | kg/lb conversion, rounding, date strings, Saturday week math | none | IUnits, IDates | none |
| C11 | UI Kit | Design system: Sheet, Modal, Stepper, UndoToast, PlateBar, focus trap, theme, chart card | none | UI components | none |
| C12 | App Shell & Composition Views | Routing, layout/nav, Dashboard, Exercise detail, Exercise sheet, Charts and Settings pages | none | (top level) | all of the above |
| C13 | Crew & Leaderboard (future) | Opt-in sharing and ranking | `crews` (new) | ICrew | IProgress, IDataStore, IProfile |

Dependency direction: C12 -> C3..C9 -> C2 / C10 / C11. No cycles (C4 does not know C6; C5 reads logs only through C4).

## File ownership (current file -> component)

| File | Component | Note |
|---|---|---|
| `firebase.js` | C2 | auth export also used by C1 (split: `db` -> C2, `auth` -> C1) |
| `AppContext.jsx` | MIXED | auth+profile -> C1; add/put/merge/ensureDoc/upd/del/useCol -> C2; show/toKg -> C10 |
| `pages/Login.jsx`, `pages/Settings.jsx` (profile fields) | C1 | Settings is a Composition View (C12) that calls IProfile and IAttendance |
| `data/exercises.json`, `data/muscleFolders.js`, `data/popular.js`, `data/videos.json`, `lib/exerciseSearch.js`, `lib/exerciseData.js`, `lib/exerciseSummary.js` | C3 | |
| `lib/exerciseViews.js` | MIXED | libView/customView/docView -> C3; recentExerciseIds, groupLogs -> C4 |
| `pages/Exercises.jsx`, `exercise/{ExerciseImage,ExerciseMedia,MuscleChips,HowTo,FavoriteButton,MyCustom}.jsx` | C3 | MyCustom = custom exercises + user folders (two sub-modules of C3) |
| `exercise/LogTab.jsx`, `lib/setDrafts.js` | C4 | the "Add to today's plan" button inside LogTab moves to C6 (`AddToPlanButton`) |
| `lib/exerciseStats.js`, `exercise/{ProgressPanel,Glance}.jsx`, `computePRs`/`epley` from utils | C5 | |
| `pages/Charts.jsx` | C12 | Composition View over C5 data |
| `lib/plan.js`, `data/planTemplates.js`, `lib/usePlan.js`, `lib/usePlanActions.js`, `components/plan/*`, `pages/Plan.jsx` | C6 | `usePlan` contains the legacy migration (sub-module) |
| `weekStart`, `weekStreak`, `WEEK_GOAL`, checkin logic in Dashboard | C7 | week math primitives (`weekStart`) live in C10, streak/goal in C7 |
| `pages/Body.jsx`, `progressPct` | C8 | |
| `pages/InBody.jsx`, `compressImage`, `IN_METRICS` | C9 | |
| `utils.js` | MIXED | split: KG_PER_LB/r1/ymd/todayStr/fmtDate/shortDate/DAY_NAMES/WEEK_ORDER/byDate/weekStart -> C10; computePRs/epley -> C5; weekStreak/WEEK_GOAL -> C7; progressPct -> C8; compressImage/IN_METRICS -> C9; COLORS -> C11 |
| `components/{Sheet,Modal,Stepper,PlateBar,ChartCard}.jsx`, `plan/UndoToast.jsx`, `lib/useFocusTrap.js`, `styles.css` | C11 | UndoToast and PlateBar are generic visuals |
| `App.jsx`, `main.jsx`, `components/Layout.jsx`, `pages/Dashboard.jsx`, `pages/ExerciseDetail.jsx`, `exercise/{ExerciseSheet,useExerciseSheet}.jsx`, `plan/TodayCard.jsx` | C12 | Composition Views: only wire components, no rules |

## Mixed-responsibility spots found (and how the design fixes them)
1. `AppContext.jsx` mixed auth, profile, units and data access -> C1, C2, C10.
2. `utils.js` mixed six unrelated concerns -> split across C5, C7, C8, C9, C10, C11.
3. `exerciseViews.js` mixed catalog views with log helpers -> C3 / C4.
4. `ExerciseDetail.jsx`, `Dashboard.jsx`, `Settings.jsx`, `Charts.jsx`, `ExerciseSheet.jsx`, `TodayCard.jsx` each combine several components -> declared Composition Views (C12) that only call interfaces.
5. `LogTab.jsx` edited the plan directly -> goes through IPlan (C6).
6. `MyCustom.jsx` holds custom exercises and user folders -> two sub-modules of C3.
7. Weekly goal was split across profile (`weeklyGoal`), plan (`planGoal`) and utils (`WEEK_GOAL`) -> owned by C7, which reads IPlan and IProfile.
