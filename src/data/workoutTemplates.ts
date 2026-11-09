import type {
  ExerciseKind,
  TemplateItemInput,
  WorkoutTemplate,
  WorkoutTemplateInput,
} from '../components/fitness/types';
import type { Database, Executor } from '../db/database';
import { DataError } from './errors';
import { checkNumber, checkText } from './validation';

const GONE = "Cette séance favorite n'existe plus.";
const MAX_ITEMS = 50;

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
}

/**
 * Checks the exercises of a favorite: those of the library, not archived
 * ones. They hold no values: a session started from the favorite begins with
 * the sets of the last time.
 */
async function checkItems(
  tx: Executor,
  items: unknown,
): Promise<TemplateItemInput[]> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new DataError('La séance doit contenir au moins un exercice.');
  }
  if (items.length > MAX_ITEMS) {
    throw new DataError(`${MAX_ITEMS} exercices maximum par séance.`);
  }
  const lines = (items as TemplateItemInput[]).map((item) => ({
    exerciseId: checkNumber(item.exerciseId, 'exercice', {
      min: 0,
      exclusive: true,
      integer: true,
    }),
  }));

  const ids = [...new Set(lines.map(({ exerciseId }) => exerciseId))];
  const exercises = await tx.query<{ id: number }>(
    `SELECT id FROM exercise
     WHERE archived = 0 AND id IN (${ids.map(() => '?').join(', ')})`,
    ids,
  );
  if (exercises.length !== ids.length) {
    throw new DataError("Un des exercices n'existe plus.");
  }
  return lines;
}

async function insertItems(
  tx: Executor,
  templateId: number,
  items: TemplateItemInput[],
) {
  for (const [position, item] of items.entries()) {
    await tx.run(
      `INSERT INTO workout_template_exercise (template_id, exercise_id, position)
       VALUES (?, ?, ?)`,
      [templateId, item.exerciseId, position],
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
    `SELECT t.id, t.template_id, t.exercise_id, e.name, e.kind
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
    const items = await checkItems(tx, input.items);
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
    const items = await checkItems(tx, input.items);
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
