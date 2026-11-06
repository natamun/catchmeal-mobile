import { useEffect, useState } from 'react';

import { listWorkoutsBetween } from '../components/fitness/api';
import type { Workout } from '../components/fitness/types';
import { getWeightHistory, type WeightEntry } from '../components/profile/api';
import { useDataVersion } from './useDataVersion';

interface Training {
  workouts: Workout[];
  weighIns: WeightEntry[];
  isLoading: boolean;
}

/**
 * The training sessions between two days (YYYY-MM-DD), with the weigh-ins
 * their calories are estimated from, read again after any change.
 */
export function useTraining(from: string, to: string) {
  const version = useDataVersion();
  const [training, setTraining] = useState<Training>({
    workouts: [],
    weighIns: [],
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listWorkoutsBetween(from, to, controller.signal),
      getWeightHistory(controller.signal),
    ])
      .then(([workouts, weighIns]) =>
        setTraining({ workouts, weighIns, isLoading: false }),
      )
      .catch(() => {
        if (!controller.signal.aborted) {
          setTraining({ workouts: [], weighIns: [], isLoading: false });
        }
      });
    return () => controller.abort();
  }, [from, to, version]);

  return training;
}
