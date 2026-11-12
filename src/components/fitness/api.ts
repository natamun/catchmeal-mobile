import { changing } from '../../data/changes';
import { throwIfAborted } from '../../data/errors';
import * as exercises from '../../data/exercises';
import * as workouts from '../../data/workouts';
import * as templates from '../../data/workoutTemplates';
import { getDatabase } from '../../db/appDatabase';
import type {
  ExerciseInput,
  WorkoutItemInput,
  WorkoutTemplateInput,
} from './types';

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

/** Writes the personal note of an exercise; an empty one removes it. */
export async function setExerciseNotes(id: number, notes: string) {
  return changing(exercises.setExerciseNotes(await getDatabase(), id, notes));
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

/** The sessions between two days (YYYY-MM-DD, included), the newest first. */
export async function listWorkoutsBetween(
  from: string,
  to: string,
  signal?: AbortSignal,
) {
  const list = await workouts.listWorkouts(await getDatabase(), { from, to });
  throwIfAborted(signal);
  return list;
}

/**
 * Adds exercises to the session of a day; those the day already holds stay
 * as they are.
 */
export async function addToDay(day: string, items: WorkoutItemInput[]) {
  return changing(workouts.addToDay(await getDatabase(), day, items));
}

/** Saves the whole session of a day; without exercises, it is deleted. */
export async function saveDay(day: string, items: WorkoutItemInput[]) {
  return changing(workouts.saveDay(await getDatabase(), day, items));
}

/**
 * What was done on the exercise the last time, outside the day being
 * logged, or null.
 */
export async function getLastPerformance(
  exerciseId: number,
  exceptDay?: string,
) {
  return workouts.lastPerformance(await getDatabase(), exerciseId, exceptDay);
}

/** Every favorite session with its exercises, sorted by name. */
export async function listTemplates(signal?: AbortSignal) {
  const list = await templates.listTemplates(await getDatabase());
  throwIfAborted(signal);
  return list;
}

/** Saves a new favorite session. */
export async function createTemplate(input: WorkoutTemplateInput) {
  return changing(templates.createTemplate(await getDatabase(), input));
}

/** Saves an edited favorite session, its exercises replaced. */
export async function updateTemplate(id: number, input: WorkoutTemplateInput) {
  return changing(templates.updateTemplate(await getDatabase(), id, input));
}

/** Deletes a favorite session; the sessions started from it stay. */
export async function deleteTemplate(id: number) {
  return changing(templates.deleteTemplate(await getDatabase(), id));
}
