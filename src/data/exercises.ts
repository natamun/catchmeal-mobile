import type {
  Exercise,
  ExerciseInput,
  ExerciseKind,
} from '../components/fitness/types';
import type { Executor } from '../db/database';
import { DataError } from './errors';
import { checkChoice, checkText } from './validation';

export const EXERCISE_KINDS: readonly ExerciseKind[] = [
  'STRENGTH',
  'TREADMILL',
  'CARDIO',
];

/** Effort given to a cardio exercise the user adds: moderate. */
export const DEFAULT_CARDIO_MET = 5;

const GONE = "Cet exercice n'existe plus.";

interface ExerciseRow {
  id: number;
  name: string;
  kind: ExerciseKind;
  met: number | null;
  archived: number;
}

const COLUMNS = 'id, name, kind, met, archived';

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    met: row.met,
    archived: row.archived === 1,
  };
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });

/** Checks an exercise before saving it; the name comes back trimmed. */
export function validateExercise(input: ExerciseInput): ExerciseInput {
  return {
    name: checkText(input.name, 'nom', 80),
    kind: checkChoice(input.kind, 'type', EXERCISE_KINDS),
  };
}

/**
 * Two exercises of the library cannot share a name, case and accents aside:
 * the sessions and their progress are told apart by it. An archived one
 * leaves its name free.
 */
async function checkNameIsFree(db: Executor, name: string, exceptId?: number) {
  const rows = await db.query<{ id: number; name: string }>(
    'SELECT id, name FROM exercise WHERE archived = 0',
  );
  if (rows.some((row) => row.id !== exceptId && byName(row, { name }) === 0)) {
    throw new DataError('Un exercice porte déjà ce nom.');
  }
}

async function findExercise(db: Executor, id: number) {
  const [row] = await db.query<ExerciseRow>(
    `SELECT ${COLUMNS} FROM exercise WHERE id = ?`,
    [id],
  );
  return row ? toExercise(row) : null;
}

/**
 * The whole exercise library sorted by name the French way, archived
 * exercises included: the screens hide them.
 */
export async function listExercises(db: Executor) {
  const rows = await db.query<ExerciseRow>(`SELECT ${COLUMNS} FROM exercise`);
  return rows.map(toExercise).sort(byName);
}

/** Adds an exercise; a cardio one gets a moderate effort. */
export async function createExercise(db: Executor, input: ExerciseInput) {
  const exercise = validateExercise(input);
  await checkNameIsFree(db, exercise.name);
  const { lastId } = await db.run(
    'INSERT INTO exercise (name, kind, met) VALUES (?, ?, ?)',
    [
      exercise.name,
      exercise.kind,
      exercise.kind === 'CARDIO' ? DEFAULT_CARDIO_MET : null,
    ],
  );
  return (await findExercise(db, lastId))!;
}

/**
 * Renames an exercise or changes its kind. The kind is locked once a
 * session uses the exercise: its sets or durations would no longer fit.
 */
export async function updateExercise(
  db: Executor,
  id: number,
  input: ExerciseInput,
) {
  const exercise = validateExercise(input);
  const current = await findExercise(db, id);
  if (!current || current.archived) throw new DataError(GONE);
  await checkNameIsFree(db, exercise.name, id);

  let met = current.met;
  if (exercise.kind !== current.kind) {
    const [used] = await db.query(
      'SELECT 1 FROM workout_exercise WHERE exercise_id = ? LIMIT 1',
      [id],
    );
    if (used) {
      throw new DataError(
        'Cet exercice a déjà des séances : son type ne peut plus changer.',
      );
    }
    met = exercise.kind === 'CARDIO' ? DEFAULT_CARDIO_MET : null;
  }

  await db.run('UPDATE exercise SET name = ?, kind = ?, met = ? WHERE id = ?', [
    exercise.name,
    exercise.kind,
    met,
    id,
  ]);
  return (await findExercise(db, id))!;
}

/**
 * Archives an exercise instead of deleting it, so the sessions that use it
 * keep it.
 */
export async function archiveExercise(db: Executor, id: number) {
  const { changes } = await db.run(
    'UPDATE exercise SET archived = 1 WHERE id = ? AND archived = 0',
    [id],
  );
  if (changes === 0) throw new DataError(GONE);
  return (await findExercise(db, id))!;
}
