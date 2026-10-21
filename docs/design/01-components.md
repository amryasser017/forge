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
| C5 | Progress & Analytics | PRs, trends, best weight, progress views | none (derived) | IProgress | IUnits, IDates (pure functions: callers pass the logs in) |
| C6 | Weekly Plan | 7-day plan, templates, shift/move/swap/copy/clear, undo, legacy schedule migration | `plan`, `schedule` (legacy, read-only) | IPlan | IDataStore, IExerciseCatalog, IProgress (glance) |
| C7 | Attendance & Goals | Gym days, check-ins, weekly goal, week streak | `checkins` | IAttendance | IDataStore, ILogReader, IPlan, IProfile, IDates |
| C8 | Body Tracking | Weigh-ins, goal progress % | `weights` | IBodyTracker, IBodyReader | IDataStore, IProfile, IUnits |
| C9 | InBody Reports | Reports, metrics, image compression | `inbody` | IInBody, IInBodyReader | IDataStore, IUnits |
| C10 | Units & Dates (Shared Kernel) | kg/lb conversion, rounding, date strings, Saturday week math | none | IUnits, IDates | none |
| C11 | UI Kit | Design system: Sheet, Modal, Stepper, UndoToast, PlateBar, focus trap, theme, chart card | none | UI components | none |
| C12 | App Shell & Composition Views | Routing, layout/nav, Dashboard, Exercise detail, Exercise sheet, Charts and Settings pages | none | (top level) | all of the above |
| C13 | Crew & Leaderboard (future) | Opt-in sharing and ranking | `crews` (new) | ICrew | IProgress, IDataStore, IProfile |

Dependency direction: C12 -> C3..C9 -> C2 / C10 / C11. No cycles: C5 receives logs as arguments (it does not call C4), C4 uses C5 and C3, C6 uses C3 and C5, C2 receives the uid from the shell (no dependency on C1). See docs/Forge_Component_Spec.docx for the full provided/required lists.

## Where each component lives in the code (done)
| Component | Folder | Main files |
|---|---|---|
| C1 Identity & Profile | `packages/identity/` (`@forge/identity`) | AuthProvider.jsx, ProfileProvider.jsx, Login.jsx |
| C2 Data Store | `packages/datastore/` (`@forge/datastore`) | DataStore.jsx (makeDataStore, DataStoreProvider, useDataStore, useCol), firebase.js (app init) |
| C3 Exercise Library | `src/library/` | data/, exerciseData.js, exerciseSearch.js, exerciseSummary.js, exerciseViews.js, useExerciseDocs.js, components/ |
| C4 Workout Logging | `src/logging/` | LogTab.jsx, setDrafts.js, logReader.js, useLogs.js |
| C5 Progress & Analytics | `src/progress/` | exerciseStats.js, prs.js, ProgressPanel.jsx, Glance.jsx |
| C6 Weekly Plan | `src/plan/` | plan.js, planTemplates.js, usePlan.js, usePlanActions.js, components/ |
| C7 Attendance & Goals | `src/attendance/` | attendance.js, useAttendance.js |
| C8 Body Tracking | `src/body/` | BodyPage.jsx, bodyMath.js, useWeights.js |
| C9 InBody Reports | `src/inbody/` | InBodyPage.jsx, inbody.js, useReports.js |
| C10 Units & Dates | `packages/shared/` (`@forge/shared`) | units.js, UnitsProvider.jsx, dates.js |
| C11 UI Kit | `packages/ui/` (`@forge/ui`) | Sheet, Modal, Stepper, UndoToast, PlateBar, ChartCard, useFocusTrap, colors.js, styles.css |
| C12 App Shell & Composition Views | `src/app/` | App.jsx, Layout.jsx, views/ (Dashboard, Lifts, ExerciseDetail, ExerciseSheet, PlanPage, TodayCard, Charts, Settings) |

C1, C2, C10 and C11 are npm workspace packages (`packages/*`, see `packages/README.md`); the other components are folders of the app in `src/`. `tests/architecture.test.js` checks these rules on every `npm test`: components only import the components they are allowed to use (packages declare theirs in `package.json`), packages are imported only through their entry point, only the `datastore` and `identity` packages import the Firebase SDK, and the component graph has no cycles.

## What was split (the mixed files found earlier)
1. `AppContext.jsx` -> `datastore/` (data helpers, `useCol`), `identity/` (session, profile), `shared/UnitsProvider` (units).
2. `utils.js` -> `shared/` (units, dates), `progress/prs.js`, `attendance/attendance.js`, `body/bodyMath.js`, `inbody/inbody.js`, `ui/colors.js`.
3. `exerciseViews.js` -> `library/exerciseViews.js` (views) and `logging/logReader.js` (groupLogs, recentExerciseIds, setsOn).
4. Pages that combine components are now Composition Views in `app/views/`.
5. `LogTab` no longer edits the plan: the shell passes `AddToTodayButton` (plan) into it as a slot.
6. The library and plan components no longer read logs: the Lifts and Plan views pass them in.
7. The weekly goal and week summary moved into `attendance/` (`useAttendance`).
