import type { Database, Executor, SqlValue } from '../db/database';
import { DataError } from './errors';

const APP = 'CatCHMeal';

/**
 * Version of the file layout. A newer app keeps reading older files; an older
 * app refuses a newer file instead of guessing.
 */
export const BACKUP_FORMAT = 1;

/** The stored columns of each table, in the order rows are restored. */
const TABLES = {
  profile: [
    'height',
    'target_weight',
    'daily_calorie_goal',
    'daily_protein_goal',
    'daily_carbs_goal',
    'daily_fat_goal',
    'gender',
    'birth_date',
    'activity_level',
  ],
  food_item: [
    'id',
    'name',
    'brand',
    'barcode',
    'base_quantity',
    'base_unit',
    'kcal',
    'protein',
    'carbs',
    'fat',
    'archived',
  ],
  meal: ['id', 'name', 'type_meal', 'logged_at', 'source_meal_id'],
  meal_item: [
    'id',
    'meal_id',
    'food_item_id',
    'quantity',
    'kcal',
    'protein',
    'carbs',
    'fat',
  ],
  weight_log: [
    'id',
    'weight',
    'body_fat',
    'fat_free_mass',
    'body_water',
    'muscle_mass',
    'logged_at',
  ],
  goal_setting: [
    'id',
    'daily_calories',
    'daily_protein',
    'daily_carbs',
    'daily_fat',
    'objective',
    'start_date',
  ],
} as const;

type Table = keyof typeof TABLES;
type Row = Record<string, SqlValue>;

/** Every table but the one-row profile, which is updated, not inserted. */
const LIST_TABLES = [
  'food_item',
  'meal',
  'meal_item',
  'weight_log',
  'goal_setting',
] as const satisfies readonly Table[];

/** The content of a backup file. */
export interface Backup {
  app: typeof APP;
  format: number;
  exportedAt: string;
  profile: Row;
  food_item: Row[];
  meal: Row[];
  meal_item: Row[];
  weight_log: Row[];
  goal_setting: Row[];
}

/** What a restore brought back, for the confirmation message. */
export interface RestoreSummary {
  foodItems: number;
  meals: number;
  weighIns: number;
}

const NOT_A_BACKUP = "Ce fichier n'est pas une sauvegarde CatCHMeal.";

/** Every row of the app, as stored, ready to be written to a file. */
export async function exportBackup(
  db: Executor,
  now = new Date(),
): Promise<Backup> {
  const read = (table: Table, where = '') =>
    db.query<Row>(`SELECT ${TABLES[table].join(', ')} FROM ${table} ${where}`);

  const [profile] = await read('profile', 'WHERE id = 1');
  const backup: Backup = {
    app: APP,
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    profile,
    food_item: [],
    meal: [],
    meal_item: [],
    weight_log: [],
    goal_setting: [],
  };
  for (const table of LIST_TABLES) {
    backup[table] = await read(table, 'ORDER BY id');
  }
  return backup;
}

const isRow = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads a backup file. Throws a DataError for a file that is not a CatCHMeal
 * backup, or one written by a newer version of the app. The rows themselves
 * are checked by the database when they are restored.
 */
export function parseBackup(text: string): Backup {
  let content: unknown;
  try {
    content = JSON.parse(text);
  } catch {
    throw new DataError(NOT_A_BACKUP);
  }
  if (!isRow(content) || content.app !== APP) {
    throw new DataError(NOT_A_BACKUP);
  }
  if (typeof content.format !== 'number' || content.format > BACKUP_FORMAT) {
    throw new DataError(
      "Cette sauvegarde vient d'une version plus récente de l'app.",
    );
  }
  const backup = content as unknown as Backup;
  if (
    !isRow(backup.profile) ||
    LIST_TABLES.some(
      (table) => !Array.isArray(backup[table]) || !backup[table].every(isRow),
    )
  ) {
    throw new DataError(NOT_A_BACKUP);
  }
  return backup;
}

/** The value of a column, or null when the file left it out. */
const valueOf = (row: Row, column: string): SqlValue => row[column] ?? null;

/**
 * Replaces all the data of the app with the backup, in one transaction: when
 * one row breaks a rule of the database, nothing changes.
 */
export async function restoreBackup(
  db: Database,
  backup: Backup,
): Promise<RestoreSummary> {
  try {
    await db.transaction(async (tx) => {
      for (const table of [...LIST_TABLES].reverse()) {
        await tx.run(`DELETE FROM ${table}`);
      }

      const profileColumns = TABLES.profile;
      await tx.run(
        `UPDATE profile SET ${profileColumns.map((c) => `${c} = ?`).join(', ')} WHERE id = 1`,
        profileColumns.map((column) => valueOf(backup.profile, column)),
      );

      // Each row is inserted after the rows it points to, so a broken link is
      // refused by its own INSERT. A meal made from another meal gets that link
      // once every meal is back.
      for (const table of LIST_TABLES) {
        const columns = TABLES[table];
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
        for (const row of backup[table]) {
          await tx.run(
            sql,
            columns.map((column) =>
              table === 'meal' && column === 'source_meal_id'
                ? null
                : valueOf(row, column),
            ),
          );
        }
      }
      for (const meal of backup.meal) {
        if (valueOf(meal, 'source_meal_id') !== null) {
          await tx.run('UPDATE meal SET source_meal_id = ? WHERE id = ?', [
            valueOf(meal, 'source_meal_id'),
            valueOf(meal, 'id'),
          ]);
        }
      }
    });
  } catch (error) {
    if (error instanceof DataError) throw error;
    throw new DataError(
      'Cette sauvegarde est abîmée : aucune donnée n’a été modifiée.',
    );
  }

  return {
    foodItems: backup.food_item.length,
    meals: backup.meal.filter((meal) => meal.logged_at !== null).length,
    weighIns: backup.weight_log.length,
  };
}
