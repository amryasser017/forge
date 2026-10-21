# Forge packages

Four components live here as npm workspace packages. The app (`src/`) uses them by name, for example `import { useAuth } from '@forge/identity'`. Only the public entry point (`src/index.js` of each package) may be imported; `tests/architecture.test.js` enforces this.

| Package | What it gives you | Depends on |
|---|---|---|
| `@forge/shared` | `makeUnits`, `UnitsProvider`/`useUnits` (kg/lb), dates (`ymd`, `weekStart` with Saturday first, ...) | nothing |
| `@forge/ui` | `Sheet`, `Modal`, `Stepper`, `UndoToast`, `PlateBar`, `ChartCard`, `useFocusTrap`, `COLORS`, and the theme in `@forge/ui/styles.css` | nothing |
| `@forge/datastore` | the Firebase app (`auth`, `db`, `googleProvider`) and the data store: `DataStoreProvider` (give it the signed-in uid), `useDataStore()`, `useCol(name)` | Firebase |
| `@forge/identity` | `AuthProvider`/`useAuth()`, `ProfileProvider`/`useProfile()`, `Login` | `@forge/datastore` |

## Using them in another project
1. Copy the package folders you need into your repo's `packages/` (or publish them to a private npm registry) and add `"workspaces": ["packages/*"]` to the root `package.json`.
2. Add the packages as dependencies (`"@forge/identity": "*"`) and run `npm install`.
3. Wire the providers in your app shell: `AuthProvider` -> `DataStoreProvider uid={user.uid}` -> `ProfileProvider` -> `UnitsProvider`.
4. Set the `VITE_FIREBASE_*` variables, enable Email/Password and Google in Firebase Auth, add your domain to Authorized domains, and publish Firestore rules for `users/{uid}`.
5. Change `defaultProfile` in `packages/identity/src/ProfileProvider.jsx` to your own profile fields, and import `@forge/ui/styles.css` (or replace the theme).

Each package has its own tests in `packages/<name>/tests`; `npm test` runs all of them.
