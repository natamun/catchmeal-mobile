import { useCallback } from 'react';
import { Trophy } from 'lucide-react';

import { formatKg } from '../../utils/format';
import { useToast } from '../ui/toastContext';
import { newRecords } from './records';
import type { Workout, WorkoutItemInput } from './types';

/**
 * Returns announce(), which tells a saved session: its new records with a
 * trophy, or else `message`. `history` is the sessions as they were before
 * saving, the day saved included: saving again a load the day already held
 * sets no record.
 */
export function useAnnounceSave() {
  const showToast = useToast();

  return useCallback(
    (
      history: readonly Workout[],
      items: readonly WorkoutItemInput[],
      nameOf: (exerciseId: number) => string | undefined,
      message: string,
    ) => {
      const records = newRecords(history, items);
      if (records.length === 0) {
        showToast(message);
      } else if (records.length === 1) {
        const [{ exerciseId, weightKg }] = records;
        showToast(
          `Nouveau record : ${nameOf(exerciseId)}, ${formatKg(weightKg)} kg`,
          Trophy,
        );
      } else {
        showToast(`${records.length} nouveaux records !`, Trophy);
      }
    },
    [showToast],
  );
}
