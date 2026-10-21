// The Data Store owns the Firebase app: identity uses `auth` and `googleProvider` from here.
export { makeDataStore, DataStoreProvider, useDataStore, useCol } from './DataStore';
export { auth, db, googleProvider } from './firebase';
