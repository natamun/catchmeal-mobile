import { oneRepMax } from './progress';
import type { Workout, WorkoutItem, WorkoutItemInput } from './types';

export interface StrengthRecord {
  /** The heaviest load ever lifted, and the day. */
  weightKg: number;
  day: string;
  /** The best estimated one-rep max, and the day. */
  oneRepMax: number;
  oneRepMaxDay: string;
}

/** One time an exercise was done: the day, and what was done. */
export interface ExerciseEntry {
  day: string;
  workoutId: number;
  item: WorkoutItem;
}

/** Every time an exercise was done, the newest first. */
export function exerciseHistory(
  workouts: readonly Workout[],
  exerciseId: number,
): ExerciseEntry[] {
  return workouts
    .flatMap((workout) =>
      workout.items
        .filter((item) => item.exerciseId === exerciseId)
        .map((item) => ({
          day: workout.performedOn,
          workoutId: workout.id,
          item,
        })),
    )
    .sort((a, b) => b.day.localeCompare(a.day) || b.workoutId - a.workoutId);
}

/**
 * The last time each exercise was done: its line in the newest session that
 * holds it. What the favorites and the library show as a reminder.
 */
export function latestItems(workouts: readonly Workout[]) {
  const latest = new Map<number, WorkoutItem>();
  const newestFirst = [...workouts].sort((a, b) =>
    b.performedOn.localeCompare(a.performedOn),
  );
  for (const workout of newestFirst) {
    for (const item of workout.items) {
      if (!latest.has(item.exerciseId)) latest.set(item.exerciseId, item);
    }
  }
  return latest;
}

/**
 * The best of a strength exercise: its heaviest load and its best estimated
 * one-rep max, each with the first day it was reached. Null when it was
 * never done.
 */
export function strengthRecord(
  workouts: readonly Workout[],
  exerciseId: number,
): StrengthRecord | null {
  let record: StrengthRecord | null = null;
  const entries = exerciseHistory(workouts, exerciseId).reverse();
  for (const { day, item } of entries) {
    for (const set of item.sets) {
      const estimate = Math.round(oneRepMax(set) * 10) / 10;
      if (!record) {
        record = {
          weightKg: set.weightKg,
          day,
          oneRepMax: estimate,
          oneRepMaxDay: day,
        };
        continue;
      }
      if (set.weightKg > record.weightKg) {
        record = { ...record, weightKg: set.weightKg, day };
      }
      if (estimate > record.oneRepMax) {
        record = { ...record, oneRepMax: estimate, oneRepMaxDay: day };
      }
    }
  }
  return record;
}

export interface NewRecord {
  exerciseId: number;
  weightKg: number;
}

/**
 * The strength exercises of a session that beat the heaviest load of every
 * session before (the one edited left out). An exercise done for the first
 * time sets no record: there is nothing to beat yet.
 */
export function newRecords(
  history: readonly Workout[],
  items: readonly WorkoutItemInput[],
  exceptWorkoutId?: number,
): NewRecord[] {
  const before = history.filter(({ id }) => id !== exceptWorkoutId);
  const records: NewRecord[] = [];
  for (const { exerciseId, sets } of items) {
    if (!sets?.length || records.some((r) => r.exerciseId === exerciseId)) {
      continue;
    }
    const previous = strengthRecord(before, exerciseId);
    const best = Math.max(...sets.map(({ weightKg }) => weightKg));
    if (previous && best > previous.weightKg) {
      records.push({ exerciseId, weightKg: best });
    }
  }
  return records;
}
