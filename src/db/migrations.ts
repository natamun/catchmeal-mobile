import type { Database } from './database';

/** One step of the schema: applied once, in version order. */
export interface Migration {
  version: number;
  sql: string;
}

/**
 * The first schema, from the CatCHMeal data model without accounts.
 *
 * - Days of meals are local dates (YYYY-MM-DD); weigh-ins and goals keep the
 *   exact moment as an ISO timestamp.
 * - The checks keep the data consistent (positive quantities, known values,
 *   a logged meal has a type). The limits shown in the forms (500 kg at most,
 *   120 characters...) are checked by the app before saving.
 */
const SCHEMA_V1 = `
CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  height REAL CHECK (height > 0),
  target_weight REAL CHECK (target_weight > 0),
  daily_calorie_goal INTEGER CHECK (daily_calorie_goal > 0),
  daily_protein_goal INTEGER CHECK (daily_protein_goal > 0),
  daily_carbs_goal INTEGER CHECK (daily_carbs_goal > 0),
  daily_fat_goal INTEGER CHECK (daily_fat_goal > 0),
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  birth_date TEXT CHECK (birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  activity_level TEXT CHECK (activity_level IN ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE'))
) STRICT;

INSERT INTO profile (id) VALUES (1);

CREATE TABLE food_item (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  brand TEXT,
  barcode TEXT CHECK (length(barcode) BETWEEN 8 AND 14 AND barcode NOT GLOB '*[^0-9]*'),
  base_quantity REAL NOT NULL CHECK (base_quantity > 0),
  base_unit TEXT NOT NULL CHECK (base_unit IN ('GRAM', 'PIECE', 'MILLILITER')),
  kcal REAL NOT NULL CHECK (kcal >= 0),
  protein REAL NOT NULL CHECK (protein >= 0),
  carbs REAL NOT NULL CHECK (carbs >= 0),
  fat REAL NOT NULL CHECK (fat >= 0),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1))
) STRICT;

CREATE TABLE meal (
  id INTEGER PRIMARY KEY,
  name TEXT,
  type_meal TEXT CHECK (type_meal IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
  logged_at TEXT CHECK (logged_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  source_meal_id INTEGER REFERENCES meal (id) ON DELETE SET NULL,
  CHECK (logged_at IS NULL OR type_meal IS NOT NULL)
) STRICT;

CREATE INDEX meal_logged_at ON meal (logged_at);

CREATE TABLE meal_item (
  id INTEGER PRIMARY KEY,
  meal_id INTEGER NOT NULL REFERENCES meal (id) ON DELETE CASCADE,
  food_item_id INTEGER REFERENCES food_item (id),
  quantity REAL NOT NULL CHECK (quantity > 0),
  kcal REAL NOT NULL CHECK (kcal >= 0),
  protein REAL NOT NULL CHECK (protein >= 0),
  carbs REAL NOT NULL CHECK (carbs >= 0),
  fat REAL NOT NULL CHECK (fat >= 0)
) STRICT;

CREATE INDEX meal_item_meal ON meal_item (meal_id);
CREATE INDEX meal_item_food_item ON meal_item (food_item_id);

CREATE TABLE weight_log (
  id INTEGER PRIMARY KEY,
  weight REAL NOT NULL CHECK (weight > 0),
  body_fat REAL CHECK (body_fat > 0 AND body_fat <= 100),
  fat_free_mass REAL CHECK (fat_free_mass > 0),
  body_water REAL CHECK (body_water > 0 AND body_water <= 100),
  muscle_mass REAL CHECK (muscle_mass > 0),
  logged_at TEXT NOT NULL
) STRICT;

CREATE INDEX weight_log_logged_at ON weight_log (logged_at);

CREATE TABLE goal_setting (
  id INTEGER PRIMARY KEY,
  daily_calories INTEGER NOT NULL CHECK (daily_calories > 0),
  daily_protein INTEGER CHECK (daily_protein > 0),
  daily_carbs INTEGER CHECK (daily_carbs > 0),
  daily_fat INTEGER CHECK (daily_fat > 0),
  objective TEXT CHECK (objective IN ('lose', 'gain')),
  start_date TEXT NOT NULL
) STRICT;

CREATE INDEX goal_setting_start_date ON goal_setting (start_date);
`;

/** Every schema step, oldest first. A new step is added at the end. */
export const MIGRATIONS: Migration[] = [{ version: 1, sql: SCHEMA_V1 }];

/**
 * Brings the schema up to date. SQLite keeps the version reached in the
 * database file (PRAGMA user_version); each missing step runs in its own
 * transaction, so a failing step leaves the database as it was before it.
 */
export async function migrate(db: Database, migrations = MIGRATIONS) {
  const [{ user_version: current }] = await db.query<{
    user_version: number;
  }>('PRAGMA user_version');

  const pending = migrations
    .filter(({ version }) => version > current)
    .sort((a, b) => a.version - b.version);

  for (const { version, sql } of pending) {
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.exec(`PRAGMA user_version = ${version}`);
    });
  }
}
