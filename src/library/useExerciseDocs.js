import { useCol } from '@forge/datastore';

/** Live list of the athlete's exercise documents (favorites, custom exercises, lib_<id> documents): { items, loading }. Part of IExerciseCatalog. */
export const useExerciseDocs = () => useCol('exercises');
