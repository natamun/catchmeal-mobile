import { oneRepMax } from './progress';
import type {
  Workout,
  WorkoutItem,
  WorkoutItemInput,
  WorkoutSet,
} from './types';

export interface StrengthRecord {
  /** The heaviest load ever lifted, and the day. */
  weightKg: number;
  day: string;
  /** The strongest set, load and repetitions weighed together, and the day. */
  bestSet: WorkoutSet;
  bestSetDay: string;
  /** The biggest volume of a session (repetitions × load), and the day. */
  volumeKg: number;
  volumeDay: string;
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
 * The best of a strength exercise: its heaviest load, its strongest set
 * and its biggest session volume, each with the first day it
 * was reached. Null when it was never done.
 */
export function strengthRecord(
  workouts: readonly Workout[],
  exerciseId: number,
): StrengthRecord | null {
  let record = null as StrengthRecord | null;
  const entries = exerciseHistory(workouts, exerciseId).reverse();
  for (const { day, item } of entries) {
    const volume = item.sets.reduce(
      (sum, { reps, weightKg }) => sum + reps * weightKg,
      0,
    );
    if (record && volume > record.volumeKg) {
      record = { ...record, volumeKg: volume, volumeDay: day };
    }
    for (const set of item.sets) {
      if (!record) {
        record = {
          weightKg: set.weightKg,
          day,
          bestSet: set,
          bestSetDay: day,
          volumeKg: volume,
          volumeDay: day,
        };
        continue;
      }
      if (set.weightKg > record.weightKg) {
        record = { ...record, weightKg: set.weightKg, day };
      }
      if (oneRepMax(set) > oneRepMax(record.bestSet)) {
        record = { ...record, bestSet: set, bestSetDay: day };
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
 * session in `history`, the one being saved as it was included: saving it
 * again unchanged sets no record. An exercise done for the first time sets
 * no record: there is nothing to beat yet.
 */
export function newRecords(
  history: readonly Workout[],
  items: readonly WorkoutItemInput[],
): NewRecord[] {
  const records: NewRecord[] = [];
  for (const { exerciseId, sets } of items) {
    if (!sets?.length || records.some((r) => r.exerciseId === exerciseId)) {
      continue;
    }
    const previous = strengthRecord(history, exerciseId);
    const best = Math.max(...sets.map(({ weightKg }) => weightKg));
    if (previous && best > previous.weightKg) {
      records.push({ exerciseId, weightKg: best });
    }
  }
  return records;
}
