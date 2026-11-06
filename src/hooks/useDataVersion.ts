import { useSyncExternalStore } from 'react';

import { getDataVersion, subscribeToDataChanges } from '../data/changes';

/**
 * The current data version: put it in the dependencies of an effect that
 * reads stored data, so the effect runs again after any change.
 */
export function useDataVersion() {
  return useSyncExternalStore(subscribeToDataChanges, getDataVersion);
}
