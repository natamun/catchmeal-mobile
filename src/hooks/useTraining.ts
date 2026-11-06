import { useEffect, useState } from 'react';

import { listWorkoutsBetween } from '../components/fitness/api';
import type { Workout } from '../components/fitness/types';
import { useDataVersion } from './useDataVersion';

interface Training {
  workouts: Workout[];
  isLoading: boolean;
}

/**
 * The training sessions between two days (YYYY-MM-DD), read again after any
 * change.
 */
export function useTraining(from: string, to: string) {
  const version = useDataVersion();
  const [training, setTraining] = useState<Training>({
    workouts: [],
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    listWorkoutsBetween(from, to, controller.signal)
      .then((workouts) => setTraining({ workouts, isLoading: false }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setTraining({ workouts: [], isLoading: false });
        }
      });
    return () => controller.abort();
  }, [from, to, version]);

  return training;
}
