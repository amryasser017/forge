# Forge UML diagrams (24 images)

Use case, class and sequence diagrams: PlantUML from `src/*.puml` (shared style: `src/style.iuml`). Component diagrams (ball-and-socket interfaces, ports, sub systems): hand-laid SVG from `tools/cp0.mjs` to `tools/cp3.mjs` (needs Playwright). Regenerate PlantUML: `java -jar plantuml.jar -tpng -o .. src/<file>.puml`.

| Diagram | Images |
|---|---|
| Use Case (5) | `uc0_overview`, `uc1_account_library`, `uc2_plan`, `uc3_training_home`, `uc4_body_reports` |
| Component (4) | `cp0_overview`, `cp1_identity_data`, `cp2_library_logging_progress`, `cp3_plan_attendance_body` |
| Class (7) | `cl1_identity_data`, `cl2_library`, `cl3_logging_progress`, `cl4_plan`, `cl5_attendance_body_inbody`, `cl6_shared_ui`, `cl7_overview` |
| Sequence (8) | `sq1_signin`, `sq2_log_set`, `sq3_add_to_plan`, `sq4_shift_week`, `sq5_migration`, `sq6_home_checkin`, `sq7_library_search`, `sq8_inbody_save` |

## Fidelity check against the code
- Every `export` in `src/lib`, `src/data`, `src/utils.js` and `src/AppContext.jsx` (127 exports) is named in at least one diagram, apart from React hooks used only as plumbing (`useApp`).
- Every screen file maps to a use case (shown under each use case in the use case diagrams): Login (UC-01/02), Settings (UC-03/04), Exercises (UC-05), ExerciseDetail and sheet (UC-06/13/14), MyCustom (UC-08/09), Plan and plan components (UC-10/11/12/21), Dashboard (UC-15/16), Body (UC-17), InBody (UC-18/19), Charts (UC-20).
- Interface operations in the component diagrams are real function names from the code.
- Sequence diagrams were traced from: Login.jsx, AppContext.jsx, LogTab.jsx, PlanPicker.jsx, usePlanActions.js, Plan.jsx, usePlan.js, Dashboard.jsx, Exercises.jsx, FavoriteButton.jsx, ExerciseImage.jsx, InBody.jsx, utils.js (compressImage).
- Component diagrams show the target architecture (docs/design/01-components.md); the code still has a few mixed files listed there.
