import type {
  ExerciseKind,
  Workout,
  WorkoutItem,
  WorkoutItemInput,
  WorkoutSet,
} from '../components/fitness/types';
import type { Database, Executor, SqlValue } from '../db/database';
import { DataError } from './errors';
import { checkDateOnly, checkNumber, checkOptionalNumber } from './validation';

const MISSING_EXERCISE = "Un des exercices n'existe plus.";

/** Limits of what a day can hold, far beyond a real session. */
const MAX_ITEMS = 50;
const MAX_SETS = 20;
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
}

interface ItemRow {
  id: number;
  workout_id: number;
  exercise_id: number;
  name: string;
  kind: ExerciseKind;
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

/** The lines given, with a real exercise id each; `allowEmpty` for a save. */
function checkItems(items: unknown, allowEmpty: boolean): WorkoutItemInput[] {
  if (!Array.isArray(items) || (items.length === 0 && !allowEmpty)) {
    throw new DataError('Choisis au moins un exercice.');
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
  if (items.length === 0) return [];
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
  firstPosition = 0,
) {
  for (const [index, item] of items.entries()) {
    const { lastId } = await tx.run(
      `INSERT INTO workout_exercise (workout_id, exercise_id, position, duration_minutes, speed_kmh, incline_percent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        workoutId,
        item.exerciseId,
        firstPosition + index,
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
    `SELECT id, performed_on FROM workout WHERE ${where}
     ORDER BY performed_on DESC`,
    params,
  );
  const items = await db.query<ItemRow>(
    `SELECT we.id, we.workout_id, we.exercise_id, e.name, e.kind,
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
    items: items
      .filter((item) => item.workout_id === workout.id)
      .map((item) => toItem(item, sets)),
  }));
}

/** The session of a day (YYYY-MM-DD), or null without any. */
export async function getDay(
  db: Executor,
  day: string,
): Promise<Workout | null> {
  const [workout] = await readWorkouts(db, 'performed_on = ?', [
    checkDateOnly(day, 'date'),
  ]);
  return workout ?? null;
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

/** The id of the day's session, created when the day has none yet. */
async function workoutIdOf(tx: Executor, day: string) {
  const [existing] = await tx.query<{ id: number }>(
    'SELECT id FROM workout WHERE performed_on = ?',
    [day],
  );
  if (existing) return existing.id;
  const { lastId } = await tx.run(
    'INSERT INTO workout (performed_on) VALUES (?)',
    [day],
  );
  return lastId;
}

/**
 * Adds exercises to the session of a day, created if needed, after those
 * already there. An exercise the day already holds is left as it is: each
 * appears once a day, the new values are not added to it.
 */
export async function addToDay(
  db: Database,
  day: string,
  items: WorkoutItemInput[],
) {
  checkDateOnly(day, 'date');
  const lines = checkItems(items, false);
  return db.transaction(async (tx) => {
    const workoutId = await workoutIdOf(tx, day);
    const present = await tx.query<{ exercise_id: number; position: number }>(
      'SELECT exercise_id, position FROM workout_exercise WHERE workout_id = ?',
      [workoutId],
    );
    const taken = new Set(present.map(({ exercise_id }) => exercise_id));
    const fresh = lines.filter(({ exerciseId }) => {
      if (taken.has(exerciseId)) return false;
      taken.add(exerciseId);
      return true;
    });
    const nextPosition = Math.max(-1, ...present.map((p) => p.position)) + 1;
    await insertItems(tx, workoutId, await buildItems(tx, fresh), nextPosition);
    return (await getDay(tx, day))!;
  });
}

/**
 * Saves the whole session of a day: its exercises are replaced, in the order
 * given. Without any exercise left, the day has no session any more (null).
 */
export async function saveDay(
  db: Database,
  day: string,
  items: WorkoutItemInput[],
) {
  checkDateOnly(day, 'date');
  const lines = checkItems(items, true);
  const ids = lines.map(({ exerciseId }) => exerciseId);
  if (new Set(ids).size !== ids.length) {
    throw new DataError("Un exercice n'apparaît qu'une fois par séance.");
  }
  return db.transaction(async (tx) => {
    // Built before the old lines go, so an archived exercise they hold still
    // counts as used.
    const values = await buildItems(tx, lines);
    if (values.length === 0) {
      await tx.run('DELETE FROM workout WHERE performed_on = ?', [day]);
      return null;
    }
    const workoutId = await workoutIdOf(tx, day);
    await tx.run('DELETE FROM workout_exercise WHERE workout_id = ?', [
      workoutId,
    ]);
    await insertItems(tx, workoutId, values);
    return (await getDay(tx, day))!;
  });
}

/**
 * What was done on an exercise the last time, to start from it: the sets, or
 * the duration, speed and incline. `exceptDay` leaves out the day being
 * logged. Null when the exercise was never done.
 */
export async function lastPerformance(
  db: Executor,
  exerciseId: number,
  exceptDay?: string,
): Promise<WorkoutItem | null> {
  const [last] = await db.query<{ id: number; performed_on: string }>(
    `SELECT we.id, w.performed_on FROM workout_exercise we
     JOIN workout w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND w.performed_on != ?
     ORDER BY w.performed_on DESC
     LIMIT 1`,
    [exerciseId, exceptDay ?? ''],
  );
  if (!last) return null;
  const workout = await getDay(db, last.performed_on);
  return workout?.items.find((item) => item.id === last.id) ?? null;
}
