import { useCol } from '../datastore/DataStore';

/** Live list of all logged sets: { items, loading }. Part of ILogReader. */
export const useLogs = () => useCol('logs');
