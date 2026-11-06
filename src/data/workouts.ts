import type {
  ExerciseKind,
  Workout,
  WorkoutInput,
  WorkoutItem,
  WorkoutItemInput,
  WorkoutSet,
} from '../components/fitness/types';
import type { Database, Executor, SqlValue } from '../db/database';
import { DataError } from './errors';
import { checkDateOnly, checkNumber, checkOptionalNumber } from './validation';

const GONE = "Cette séance n'existe plus.";
const MISSING_EXERCISE = "Un des exercices n'existe plus.";

/** Limits of what a session can hold, far beyond a real one. */
const MAX_ITEMS = 50;
const MAX_SETS = 20;
const SESSION_MINUTES = { min: 0, exclusive: true, max: 600, integer: true };
const MINUTES = { min: 0, exclusive: true, max: 600 };
const SPEED = { min: 0, exclusive: true, max: 25 };
const INCLINE = { min: 0, max: 30 };
const REPS = { min: 1, max: 100, integer: true };
const LOAD = { min: 0, max: 500 };

/** Which sessions listWorkouts returns: days from `from` to `to`, included. */
export interface WorkoutFilter {
  from?: string;
  to?: string;
}

interface WorkoutRow {
  id: number;
  performed_on: string;
  duration_minutes: number | null;
}

interface ItemRow {
  id: number;
  workout_id: number;
  exercise_id: number;
  name: string;
  kind: ExerciseKind;
  met: number | null;
  duration_minutes: number | null;
  speed_kmh: number | null;
  incline_percent: number | null;
}

interface SetRow {
  workout_exercise_id: number;
  reps: number;
  weight_kg: number;
}

/** An exercise line ready to be stored: only the fields of its kind. */
interface ItemValues {
  exerciseId: number;
  sets: WorkoutSet[];
  durationMinutes: number | null;
  speedKmh: number | null;
  inclinePercent: number | null;
}

function checkItems(items: unknown): WorkoutItemInput[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new DataError('La séance doit contenir au moins un exercice.');
  }
  if (items.length > MAX_ITEMS) {
    throw new DataError(`${MAX_ITEMS} exercices maximum par séance.`);
  }
  return (items as WorkoutItemInput[]).map((item) => ({
    ...item,
    exerciseId: checkNumber(item.exerciseId, 'exercice', {
      min: 0,
      exclusive: true,
      integer: true,
    }),
  }));
}

/**
 * Keeps the fields of each line's kind, checked: the sets of a strength
 * exercise, the duration of a cardio one, with the speed and incline on a
 * treadmill. An archived exercise is only accepted when a session already
 * holds it (editing that session must keep working).
 */
async function buildItems(
  tx: Executor,
  items: WorkoutItemInput[],
): Promise<ItemValues[]> {
  const ids = [...new Set(items.map(({ exerciseId }) => exerciseId))];
  const exercises = await tx.query<{ id: number; kind: ExerciseKind }>(
    `SELECT id, kind FROM exercise
     WHERE id IN (${ids.map(() => '?').join(', ')})
       AND (archived = 0 OR EXISTS (SELECT 1 FROM workout_exercise WHERE exercise_id = exercise.id))`,
    ids,
  );
  if (exercises.length !== ids.length) throw new DataError(MISSING_EXERCISE);
  const kindOf = new Map(exercises.map(({ id, kind }) => [id, kind]));

  return items.map((item) => {
    const kind = kindOf.get(item.exerciseId)!;
    if (kind === 'STRENGTH') {
      const sets = item.sets;
      if (!Array.isArray(sets) || sets.length === 0) {
        throw new DataError(
          'Chaque exercice de musculation a au moins une série.',
        );
      }
      if (sets.length > MAX_SETS) {
        throw new DataError(`${MAX_SETS} séries maximum par exercice.`);
      }
      return {
        exerciseId: item.exerciseId,
        sets: sets.map((set) => ({
          reps: checkNumber(set.reps, 'répétitions', REPS),
          weightKg: checkNumber(set.weightKg, 'charge', LOAD),
        })),
        durationMinutes: null,
        speedKmh: null,
        inclinePercent: null,
      };
    }
    return {
      exerciseId: item.exerciseId,
      sets: [],
      durationMinutes: checkNumber(item.durationMinutes, 'durée', MINUTES),
      speedKmh:
        kind === 'TREADMILL'
          ? checkNumber(item.speedKmh, 'vitesse', SPEED)
          : null,
      inclinePercent:
        kind === 'TREADMILL'
          ? (checkOptionalNumber(item.inclinePercent, 'inclinaison', INCLINE) ??
            0)
          : null,
    };
  });
}

async function insertItems(
  tx: Executor,
  workoutId: number,
  items: ItemValues[],
) {
  for (const [position, item] of items.entries()) {
    const { lastId } = await tx.run(
      `INSERT INTO workout_exercise (workout_id, exercise_id, position, duration_minutes, speed_kmh, incline_percent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        workoutId,
        item.exerciseId,
        position,
        item.durationMinutes,
        item.speedKmh,
        item.inclinePercent,
      ],
    );
    for (const [setPosition, set] of item.sets.entries()) {
      await tx.run(
        `INSERT INTO workout_set (workout_exercise_id, position, reps, weight_kg)
         VALUES (?, ?, ?, ?)`,
        [lastId, setPosition, set.reps, set.weightKg],
      );
    }
  }
}

function toItem(row: ItemRow, sets: SetRow[]): WorkoutItem {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.name,
    kind: row.kind,
    met: row.met,
    sets: sets
      .filter((set) => set.workout_exercise_id === row.id)
      .map((set) => ({ reps: set.reps, weightKg: set.weight_kg })),
    durationMinutes: row.duration_minutes,
    speedKmh: row.speed_kmh,
    inclinePercent: row.incline_percent,
  };
}

/** Reads sessions with their lines and sets, in three queries in all. */
async function readWorkouts(db: Executor, where: string, params: SqlValue[]) {
  const workouts = await db.query<WorkoutRow>(
    `SELECT id, performed_on, duration_minutes FROM workout WHERE ${where}
     ORDER BY performed_on DESC, id DESC`,
    params,
  );
  const items = await db.query<ItemRow>(
    `SELECT we.id, we.workout_id, we.exercise_id, e.name, e.kind, e.met,
            we.duration_minutes, we.speed_kmh, we.incline_percent
     FROM workout_exercise we JOIN exercise e ON e.id = we.exercise_id
     WHERE we.workout_id IN (SELECT id FROM workout WHERE ${where})
     ORDER BY we.position, we.id`,
    params,
  );
  const sets = await db.query<SetRow>(
    `SELECT ws.workout_exercise_id, ws.reps, ws.weight_kg
     FROM workout_set ws JOIN workout_exercise we ON we.id = ws.workout_exercise_id
     WHERE we.workout_id IN (SELECT id FROM workout WHERE ${where})
     ORDER BY ws.position, ws.id`,
    params,
  );

  return workouts.map((workout): Workout => ({
    id: workout.id,
    performedOn: workout.performed_on,
    durationMinutes: workout.duration_minutes,
    items: items
      .filter((item) => item.workout_id === workout.id)
      .map((item) => toItem(item, sets)),
  }));
}

async function readWorkout(db: Executor, id: number) {
  const [workout] = await readWorkouts(db, 'id = ?', [id]);
  return workout;
}

function checkInput(input: WorkoutInput) {
  return {
    performedOn: checkDateOnly(input.performedOn, 'date'),
    durationMinutes: checkOptionalNumber(
      input.durationMinutes,
      'durée de la séance',
      SESSION_MINUTES,
    ),
    items: checkItems(input.items),
  };
}

/** Sessions with their exercises, the newest first, between two days. */
export async function listWorkouts(db: Executor, filter: WorkoutFilter = {}) {
  const conditions = ['1 = 1'];
  const params: SqlValue[] = [];
  if (filter.from !== undefined) {
    conditions.push('performed_on >= ?');
    params.push(checkDateOnly(filter.from, 'début de la période'));
  }
  if (filter.to !== undefined) {
    conditions.push('performed_on <= ?');
    params.push(checkDateOnly(filter.to, 'fin de la période'));
  }
  return readWorkouts(db, conditions.join(' AND '), params);
}

/** Saves a session with all its exercises and sets at once. */
export async function createWorkout(db: Database, input: WorkoutInput) {
  const workout = checkInput(input);
  return db.transaction(async (tx) => {
    const values = await buildItems(tx, workout.items);
    const { lastId } = await tx.run(
      'INSERT INTO workout (performed_on, duration_minutes) VALUES (?, ?)',
      [workout.performedOn, workout.durationMinutes],
    );
    await insertItems(tx, lastId, values);
    return readWorkout(tx, lastId);
  });
}

/** Saves an edited session: its exercises and sets are all replaced. */
export async function updateWorkout(
  db: Database,
  id: number,
  input: WorkoutInput,
) {
  const workout = checkInput(input);
  return db.transaction(async (tx) => {
    const [current] = await tx.query<{ id: number }>(
      'SELECT id FROM workout WHERE id = ?',
      [id],
    );
    if (!current) throw new DataError(GONE);
    // Built before the old lines go, so an archived exercise they hold still
    // counts as used.
    const values = await buildItems(tx, workout.items);

    await tx.run(
      'UPDATE workout SET performed_on = ?, duration_minutes = ? WHERE id = ?',
      [workout.performedOn, workout.durationMinutes, id],
    );
    await tx.run('DELETE FROM workout_exercise WHERE workout_id = ?', [id]);
    await insertItems(tx, id, values);
    return readWorkout(tx, id);
  });
}

/** Deletes a session with its exercises and sets. */
export async function deleteWorkout(db: Executor, id: number) {
  const { changes } = await db.run('DELETE FROM workout WHERE id = ?', [id]);
  if (changes === 0) throw new DataError(GONE);
}

/**
 * What was done on an exercise the last time, to start the next session from
 * it: the sets, or the duration, speed and incline. `exceptWorkoutId` leaves
 * out the session being edited. Null when the exercise was never done.
 */
export async function lastPerformance(
  db: Executor,
  exerciseId: number,
  exceptWorkoutId?: number,
): Promise<WorkoutItem | null> {
  const [last] = await db.query<{ id: number; workout_id: number }>(
    `SELECT we.id, we.workout_id FROM workout_exercise we
     JOIN workout w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND w.id != ?
     ORDER BY w.performed_on DESC, w.id DESC, we.position DESC
     LIMIT 1`,
    [exerciseId, exceptWorkoutId ?? -1],
  );
  if (!last) return null;
  const workout = await readWorkout(db, last.workout_id);
  return workout.items.find((item) => item.id === last.id) ?? null;
}
