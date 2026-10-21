import { useCol } from '@forge/datastore';

/** Live list of InBody reports: { items, loading }. Part of IInBodyReader. */
export const useReports = () => useCol('inbody');
