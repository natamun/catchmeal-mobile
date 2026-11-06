import { estimateWorkoutKcal, weightOn } from '../../data/workoutEnergy';
import type { Workout } from './types';

export interface TrainingSummary {
  sessions: number;
  /** Minutes of the sessions whose duration is known. */
  minutes: number;
  /** Estimated calories above rest, or null without any weigh-in. */
  kcal: number | null;
}

/** How much training a list of sessions holds. */
export function summarizeWorkouts(
  workouts: readonly Workout[],
  weighIns: readonly { weight: number; loggedAt: string }[],
): TrainingSummary {
  let kcal: number | null = null;
  for (const workout of workouts) {
    const weight = weightOn(weighIns, workout.performedOn);
    if (weight !== null) {
      kcal = (kcal ?? 0) + estimateWorkoutKcal(workout, weight).kcal;
    }
  }
  return {
    sessions: workouts.length,
    minutes: workouts.reduce(
      (sum, { durationMinutes }) => sum + (durationMinutes ?? 0),
      0,
    ),
    kcal,
  };
}

/** The strength exercises done in the sessions, sorted by name. */
export function strengthExercisesOf(workouts: readonly Workout[]) {
  const byId = new Map<number, string>();
  for (const workout of workouts) {
    for (const item of workout.items) {
      if (item.kind === 'STRENGTH')
        byId.set(item.exerciseId, item.exerciseName);
    }
  }
  return [...byId]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    );
}

/**
 * The heaviest load lifted on an exercise each day it was done, oldest
 * first: the line of its progress.
 */
export function strengthProgress(
  workouts: readonly Workout[],
  exerciseId: number,
) {
  const maxByDay = new Map<string, number>();
  for (const workout of workouts) {
    for (const item of workout.items) {
      if (item.exerciseId !== exerciseId || item.sets.length === 0) continue;
      const heaviest = Math.max(...item.sets.map((set) => set.weightKg));
      const current = maxByDay.get(workout.performedOn);
      maxByDay.set(
        workout.performedOn,
        current === undefined ? heaviest : Math.max(current, heaviest),
      );
    }
  }
  return [...maxByDay]
    .map(([day, maxWeightKg]) => ({ day, maxWeightKg }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
