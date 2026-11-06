import type {
  ExerciseKind,
  TemplateItem,
  TemplateItemInput,
  WorkoutTemplate,
  WorkoutTemplateInput,
} from '../components/fitness/types';
import type { Database, Executor } from '../db/database';
import { DataError } from './errors';
import { checkNumber, checkOptionalNumber, checkText } from './validation';

const GONE = "Cette séance favorite n'existe plus.";
const MAX_ITEMS = 50;
const MINUTES = { min: 0, exclusive: true, max: 600 };
const SPEED = { min: 0, exclusive: true, max: 25 };
const INCLINE = { min: 0, max: 30 };

interface TemplateRow {
  id: number;
  name: string;
}

interface ItemRow {
  id: number;
  template_id: number;
  exercise_id: number;
  name: string;
  kind: ExerciseKind;
  duration_minutes: number | null;
  speed_kmh: number | null;
  incline_percent: number | null;
}

/** A line ready to be stored: cardio values only for cardio. */
type ItemValues = Omit<TemplateItem, 'id' | 'exerciseName' | 'kind'>;

/**
 * Keeps the values of each line's kind: a cardio exercise may set its
 * duration (and a treadmill its speed and incline), each one optional; a
 * strength one has none, it starts from its last sets. Only exercises of the
 * library are accepted, not archived ones.
 */
async function buildItems(tx: Executor, items: unknown): Promise<ItemValues[]> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new DataError('La séance doit contenir au moins un exercice.');
  }
  if (items.length > MAX_ITEMS) {
    throw new DataError(`${MAX_ITEMS} exercices maximum par séance.`);
  }
  const lines = (items as TemplateItemInput[]).map((item) => ({
    ...item,
    exerciseId: checkNumber(item.exerciseId, 'exercice', {
      min: 0,
      exclusive: true,
      integer: true,
    }),
  }));

  const ids = [...new Set(lines.map(({ exerciseId }) => exerciseId))];
  const exercises = await tx.query<{ id: number; kind: ExerciseKind }>(
    `SELECT id, kind FROM exercise
     WHERE archived = 0 AND id IN (${ids.map(() => '?').join(', ')})`,
    ids,
  );
  if (exercises.length !== ids.length) {
    throw new DataError("Un des exercices n'existe plus.");
  }
  const kindOf = new Map(exercises.map(({ id, kind }) => [id, kind]));

  return lines.map((item) => {
    const kind = kindOf.get(item.exerciseId)!;
    const isTreadmill = kind === 'TREADMILL';
    return {
      exerciseId: item.exerciseId,
      durationMinutes:
        kind === 'STRENGTH'
          ? null
          : checkOptionalNumber(item.durationMinutes, 'durée', MINUTES),
      speedKmh: isTreadmill
        ? checkOptionalNumber(item.speedKmh, 'vitesse', SPEED)
        : null,
      inclinePercent: isTreadmill
        ? checkOptionalNumber(item.inclinePercent, 'inclinaison', INCLINE)
        : null,
    };
  });
}

async function insertItems(
  tx: Executor,
  templateId: number,
  items: ItemValues[],
) {
  for (const [position, item] of items.entries()) {
    await tx.run(
      `INSERT INTO workout_template_exercise (template_id, exercise_id, position, duration_minutes, speed_kmh, incline_percent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        templateId,
        item.exerciseId,
        position,
        item.durationMinutes,
        item.speedKmh,
        item.inclinePercent,
      ],
    );
  }
}

async function readTemplates(
  db: Executor,
  where = '1 = 1',
  params: number[] = [],
) {
  const templates = await db.query<TemplateRow>(
    `SELECT id, name FROM workout_template WHERE ${where}`,
    params,
  );
  const items = await db.query<ItemRow>(
    `SELECT t.id, t.template_id, t.exercise_id, e.name, e.kind,
            t.duration_minutes, t.speed_kmh, t.incline_percent
     FROM workout_template_exercise t JOIN exercise e ON e.id = t.exercise_id
     WHERE t.template_id IN (SELECT id FROM workout_template WHERE ${where})
     ORDER BY t.position, t.id`,
    params,
  );
  return templates
    .map((template): WorkoutTemplate => ({
      id: template.id,
      name: template.name,
      items: items
        .filter((item) => item.template_id === template.id)
        .map((item) => ({
          id: item.id,
          exerciseId: item.exercise_id,
          exerciseName: item.name,
          kind: item.kind,
          durationMinutes: item.duration_minutes,
          speedKmh: item.speed_kmh,
          inclinePercent: item.incline_percent,
        })),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    );
}

async function readTemplate(db: Executor, id: number) {
  const [template] = await readTemplates(db, 'id = ?', [id]);
  return template;
}

/** Every favorite session with its exercises, sorted by name. */
export async function listTemplates(db: Executor) {
  return readTemplates(db);
}

/** Saves a favorite session with all its exercises at once. */
export async function createTemplate(
  db: Database,
  input: WorkoutTemplateInput,
) {
  const name = checkText(input.name, 'nom', 80);
  return db.transaction(async (tx) => {
    const items = await buildItems(tx, input.items);
    const { lastId } = await tx.run(
      'INSERT INTO workout_template (name) VALUES (?)',
      [name],
    );
    await insertItems(tx, lastId, items);
    return readTemplate(tx, lastId);
  });
}

/** Saves an edited favorite session: its exercises are all replaced. */
export async function updateTemplate(
  db: Database,
  id: number,
  input: WorkoutTemplateInput,
) {
  const name = checkText(input.name, 'nom', 80);
  return db.transaction(async (tx) => {
    const { changes } = await tx.run(
      'UPDATE workout_template SET name = ? WHERE id = ?',
      [name, id],
    );
    if (changes === 0) throw new DataError(GONE);
    const items = await buildItems(tx, input.items);
    await tx.run(
      'DELETE FROM workout_template_exercise WHERE template_id = ?',
      [id],
    );
    await insertItems(tx, id, items);
    return readTemplate(tx, id);
  });
}

/** Deletes a favorite session; the sessions started from it stay. */
export async function deleteTemplate(db: Executor, id: number) {
  const { changes } = await db.run(
    'DELETE FROM workout_template WHERE id = ?',
    [id],
  );
  if (changes === 0) throw new DataError(GONE);
}
