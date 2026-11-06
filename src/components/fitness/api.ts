import { changing } from '../../data/changes';
import { throwIfAborted } from '../../data/errors';
import * as exercises from '../../data/exercises';
import * as workouts from '../../data/workouts';
import { getDatabase } from '../../db/appDatabase';
import type { ExerciseInput, WorkoutInput } from './types';

/**
 * The whole exercise library, sorted by name, archived exercises included
 * (the screens hide them).
 */
export async function listExercises(signal?: AbortSignal) {
  const list = await exercises.listExercises(await getDatabase());
  throwIfAborted(signal);
  return list;
}

/** Adds an exercise to the library. */
export async function createExercise(input: ExerciseInput) {
  return changing(exercises.createExercise(await getDatabase(), input));
}

/** Renames an exercise or changes its kind. */
export async function updateExercise(id: number, input: ExerciseInput) {
  return changing(exercises.updateExercise(await getDatabase(), id, input));
}

/** Archives the exercise: the past sessions keep it. */
export async function deleteExercise(id: number) {
  return changing(exercises.archiveExercise(await getDatabase(), id));
}

/** Every session with its exercises, the newest first. */
export async function listWorkouts(signal?: AbortSignal) {
  const list = await workouts.listWorkouts(await getDatabase());
  throwIfAborted(signal);
  return list;
}

/** Saves a new session. */
export async function createWorkout(input: WorkoutInput) {
  return changing(workouts.createWorkout(await getDatabase(), input));
}

/** Saves an edited session, its exercises replaced. */
export async function updateWorkout(id: number, input: WorkoutInput) {
  return changing(workouts.updateWorkout(await getDatabase(), id, input));
}

/** Deletes a session. */
export async function deleteWorkout(id: number) {
  return changing(workouts.deleteWorkout(await getDatabase(), id));
}

/**
 * What was done on the exercise the last time, outside the session being
 * edited, or null.
 */
export async function getLastPerformance(
  exerciseId: number,
  exceptWorkoutId?: number,
) {
  return workouts.lastPerformance(
    await getDatabase(),
    exerciseId,
    exceptWorkoutId,
  );
}
