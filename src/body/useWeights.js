import { useCol } from '../datastore/DataStore';

/** Live list of weigh-ins: { items, loading }. Part of IBodyReader. */
export const useWeights = () => useCol('weights');
