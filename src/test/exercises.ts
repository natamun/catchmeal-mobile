import type { ExerciseKind } from '../components/fitness/types';
import { createExercise } from '../data/exercises';
import type { Executor } from '../db/database';

const TEST_EXERCISES = {
  press: ['Presse à cuisses', 'STRENGTH'],
  curl: ['Leg curl assis', 'STRENGTH'],
  pulldown: ['Tirage vertical', 'STRENGTH'],
  treadmill: ['Tapis de course', 'TREADMILL'],
  rower: ['Rameur', 'CARDIO'],
} as const satisfies Record<string, readonly [string, ExerciseKind]>;

type TestExercise = keyof typeof TEST_EXERCISES;

/**
 * Adds the exercises the tests log, as the user would: the library starts
 * empty. Gives their ids by short name.
 */
export async function addTestExercises(db: Executor) {
  const ids = {} as Record<TestExercise, number>;
  for (const [key, [name, kind]] of Object.entries(TEST_EXERCISES)) {
    ids[key as TestExercise] = (await createExercise(db, { name, kind })).id;
  }
  return ids;
}
