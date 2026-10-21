import { useCol } from '@forge/datastore';

/** Live list of weigh-ins: { items, loading }. Part of IBodyReader. */
export const useWeights = () => useCol('weights');
