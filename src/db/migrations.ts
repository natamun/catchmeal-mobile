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

/** What the person aims at; it sets the pace and the protein of the goals. */
const GOAL_TYPE_V2 = `
ALTER TABLE profile ADD COLUMN goal_type TEXT CHECK (goal_type IN ('LOSE_FAT', 'LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE'));
`;

/** The color theme picked in the profile; null is the default one. */
const THEME_V3 = `
ALTER TABLE profile ADD COLUMN theme TEXT CHECK (theme IN ('foret', 'sable', 'nuit', 'ocean', 'graphite', 'prune'));
`;

/**
 * Rebuilds the profile without the check on the theme: themes are added often
 * and the app checks the name itself. A theme that no longer exists goes back
 * to the default one.
 */
const THEME_FREE_V4 = `
CREATE TABLE profile_v4 (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  height REAL CHECK (height > 0),
  target_weight REAL CHECK (target_weight > 0),
  daily_calorie_goal INTEGER CHECK (daily_calorie_goal > 0),
  daily_protein_goal INTEGER CHECK (daily_protein_goal > 0),
  daily_carbs_goal INTEGER CHECK (daily_carbs_goal > 0),
  daily_fat_goal INTEGER CHECK (daily_fat_goal > 0),
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  birth_date TEXT CHECK (birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  activity_level TEXT CHECK (activity_level IN ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTRA_ACTIVE')),
  goal_type TEXT CHECK (goal_type IN ('LOSE_FAT', 'LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE')),
  theme TEXT
) STRICT;
INSERT INTO profile_v4 SELECT id, height, target_weight, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, gender, birth_date, activity_level, goal_type, CASE WHEN theme = 'graphite' THEN theme END FROM profile;
DROP TABLE profile;
ALTER TABLE profile_v4 RENAME TO profile;
`;

/**
 * The fitness tab: a library of exercises (archived rather than deleted, like
 * foods, so past sessions keep them) and the sessions. A session lists its
 * exercises in order; a strength exercise holds sets, a cardio one its
 * duration (and the speed and incline of a treadmill). Which fields an
 * exercise fills depends on its kind: the app checks it before saving.
 */
const FITNESS_V5 = `
CREATE TABLE exercise (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  kind TEXT NOT NULL CHECK (kind IN ('STRENGTH', 'TREADMILL', 'CARDIO')),
  met REAL CHECK (met > 0),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1))
) STRICT;

CREATE TABLE workout (
  id INTEGER PRIMARY KEY,
  performed_on TEXT NOT NULL CHECK (performed_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  duration_minutes INTEGER CHECK (duration_minutes > 0)
) STRICT;

CREATE INDEX workout_performed_on ON workout (performed_on);

CREATE TABLE workout_exercise (
  id INTEGER PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES workout (id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercise (id),
  position INTEGER NOT NULL CHECK (position >= 0),
  duration_minutes REAL CHECK (duration_minutes > 0),
  speed_kmh REAL CHECK (speed_kmh > 0),
  incline_percent REAL CHECK (incline_percent >= 0)
) STRICT;

CREATE INDEX workout_exercise_workout ON workout_exercise (workout_id);
CREATE INDEX workout_exercise_exercise ON workout_exercise (exercise_id);

CREATE TABLE workout_set (
  id INTEGER PRIMARY KEY,
  workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercise (id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  reps INTEGER NOT NULL CHECK (reps > 0),
  weight_kg REAL NOT NULL CHECK (weight_kg >= 0)
) STRICT;

CREATE INDEX workout_set_workout_exercise ON workout_set (workout_exercise_id);
`;

/**
 * Favorite sessions ("Full body", "Tapis incliné"): a name and exercises in
 * order, a cardio one with its duration, speed and incline when set. Logged
 * sessions get an optional name, the favorite's they come from.
 */
const TEMPLATES_V6 = `
ALTER TABLE workout ADD COLUMN name TEXT;

CREATE TABLE workout_template (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0)
) STRICT;

CREATE TABLE workout_template_exercise (
  id INTEGER PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES workout_template (id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercise (id),
  position INTEGER NOT NULL CHECK (position >= 0),
  duration_minutes REAL CHECK (duration_minutes > 0),
  speed_kmh REAL CHECK (speed_kmh > 0),
  incline_percent REAL CHECK (incline_percent >= 0)
) STRICT;

CREATE INDEX workout_template_exercise_template ON workout_template_exercise (template_id);
CREATE INDEX workout_template_exercise_exercise ON workout_template_exercise (exercise_id);
`;

/**
 * The training becomes a logbook kept like the food journal: one session per
 * day, each exercise once in it, no name and no duration (the cardio keeps
 * its own). The sessions of a same day are merged into the first one, and an
 * exercise done twice that day keeps the first line with all the sets, in
 * the order they were logged. The name and duration columns stay, empty.
 */
const ONE_SESSION_A_DAY_V7 = `
UPDATE workout_exercise SET workout_id = (SELECT min(first.id) FROM workout first JOIN workout own ON own.performed_on = first.performed_on WHERE own.id = workout_exercise.workout_id);

DELETE FROM workout WHERE id NOT IN (SELECT min(id) FROM workout GROUP BY performed_on);

UPDATE workout_set SET workout_exercise_id = (SELECT min(first.id) FROM workout_exercise first JOIN workout_exercise own ON own.workout_id = first.workout_id AND own.exercise_id = first.exercise_id WHERE own.id = workout_set.workout_exercise_id);

DELETE FROM workout_exercise WHERE id NOT IN (SELECT min(id) FROM workout_exercise GROUP BY workout_id, exercise_id);

UPDATE workout_exercise SET position = (SELECT count(*) FROM workout_exercise other WHERE other.workout_id = workout_exercise.workout_id AND other.id < workout_exercise.id);

UPDATE workout_set SET position = (SELECT count(*) FROM workout_set other WHERE other.workout_exercise_id = workout_set.workout_exercise_id AND other.id < workout_set.id);

UPDATE workout SET name = NULL, duration_minutes = NULL;

CREATE UNIQUE INDEX workout_one_a_day ON workout (performed_on);
CREATE UNIQUE INDEX workout_exercise_once ON workout_exercise (workout_id, exercise_id);
`;

/**
 * Goals from the body composition: a target share of body fat, which sets
 * the target weight from the fat-free mass, and the alert about fat-free
 * mass lost while losing weight, on by default.
 */
const COMPOSITION_GOALS_V8 = `
ALTER TABLE profile ADD COLUMN target_body_fat REAL CHECK (target_body_fat > 0 AND target_body_fat < 100);
ALTER TABLE profile ADD COLUMN lean_loss_alert INTEGER NOT NULL DEFAULT 1 CHECK (lean_loss_alert IN (0, 1));
`;

/**
 * A portion for the foods in g or ml, such as a biscuit of 12 g, to log them
 * by the piece: its weight and an optional name.
 */
const FOOD_PORTION_V9 = `
ALTER TABLE food_item ADD COLUMN portion_quantity REAL CHECK (portion_quantity > 0);
ALTER TABLE food_item ADD COLUMN portion_name TEXT CHECK (portion_name IS NULL OR length(trim(portion_name)) > 0);
`;

/**
 * The weekly pace picked for the goal, in % of the body weight, kept so the
 * recommendation and the AI summary stay on it.
 */
const GOAL_PACE_V10 = `
ALTER TABLE profile ADD COLUMN goal_pace REAL CHECK (goal_pace >= 0 AND goal_pace <= 5);
`;

/**
 * Recipes: a name, a number of servings, an optional category and
 * preparation time, the ingredients taken from the food library, the cooking
 * written freely, the steps in order and free notes. A journal line can be servings of a recipe, its values
 * stored like a food's. An archived recipe is hidden but kept for the meals
 * that logged it.
 */
const RECIPES_V11 = `
CREATE TABLE recipe (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  servings INTEGER NOT NULL CHECK (servings > 0),
  category TEXT CHECK (category IN ('BREAKFAST', 'STARTER', 'MAIN', 'SIDE', 'DESSERT', 'SNACK', 'SAUCE', 'DRINK')),
  prep_minutes INTEGER CHECK (prep_minutes > 0),
  cooking TEXT CHECK (cooking IS NULL OR length(trim(cooking)) > 0),
  notes TEXT CHECK (notes IS NULL OR length(trim(notes)) > 0),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1))
) STRICT;

CREATE TABLE recipe_ingredient (
  id INTEGER PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipe (id) ON DELETE CASCADE,
  food_item_id INTEGER NOT NULL REFERENCES food_item (id),
  position INTEGER NOT NULL CHECK (position >= 0),
  quantity REAL NOT NULL CHECK (quantity > 0)
) STRICT;

CREATE INDEX recipe_ingredient_recipe ON recipe_ingredient (recipe_id);
CREATE INDEX recipe_ingredient_food_item ON recipe_ingredient (food_item_id);

CREATE TABLE recipe_step (
  id INTEGER PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipe (id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  instruction TEXT NOT NULL CHECK (length(trim(instruction)) > 0)
) STRICT;

CREATE INDEX recipe_step_recipe ON recipe_step (recipe_id);

ALTER TABLE meal_item ADD COLUMN recipe_id INTEGER REFERENCES recipe (id) CHECK (recipe_id IS NULL OR food_item_id IS NULL);

CREATE INDEX meal_item_recipe ON meal_item (recipe_id);
`;

/**
 * The shopping list: foods with their quantity, once each, and free texts.
 * A line stays until it is removed; checking it only marks it as in the
 * basket.
 */
const SHOPPING_V12 = `
CREATE TABLE shopping_item (
  id INTEGER PRIMARY KEY,
  food_item_id INTEGER REFERENCES food_item (id),
  label TEXT CHECK (label IS NULL OR length(trim(label)) > 0),
  quantity REAL CHECK (quantity > 0),
  checked INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
  CHECK ((food_item_id IS NULL) <> (label IS NULL)),
  CHECK ((food_item_id IS NULL) = (quantity IS NULL))
) STRICT;

CREATE UNIQUE INDEX shopping_item_food_once ON shopping_item (food_item_id);
`;

/**
 * Cardio in sets, like strength: each one a duration, with the speed and
 * incline on a treadmill and an optional resistance on another machine. A
 * cardio line logged so far becomes one set. The favorites keep no cardio
 * values any more: a session starts from the last time, as for strength.
 * The emptied columns stay, no longer read.
 */
const CARDIO_SETS_V13 = `
CREATE TABLE cardio_set (
  id INTEGER PRIMARY KEY,
  workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercise (id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  duration_minutes REAL NOT NULL CHECK (duration_minutes > 0),
  speed_kmh REAL CHECK (speed_kmh > 0),
  incline_percent REAL CHECK (incline_percent >= 0),
  resistance REAL CHECK (resistance >= 0)
) STRICT;

CREATE INDEX cardio_set_workout_exercise ON cardio_set (workout_exercise_id);

INSERT INTO cardio_set (workout_exercise_id, position, duration_minutes, speed_kmh, incline_percent) SELECT id, 0, duration_minutes, speed_kmh, incline_percent FROM workout_exercise WHERE duration_minutes IS NOT NULL;

UPDATE workout_exercise SET duration_minutes = NULL, speed_kmh = NULL, incline_percent = NULL;

UPDATE workout_template_exercise SET duration_minutes = NULL, speed_kmh = NULL, incline_percent = NULL;
`;

/** Every schema step, oldest first. A new step is added at the end. */
export const MIGRATIONS: Migration[] = [
  { version: 1, sql: SCHEMA_V1 },
  { version: 2, sql: GOAL_TYPE_V2 },
  { version: 3, sql: THEME_V3 },
  { version: 4, sql: THEME_FREE_V4 },
  { version: 5, sql: FITNESS_V5 },
  { version: 6, sql: TEMPLATES_V6 },
  { version: 7, sql: ONE_SESSION_A_DAY_V7 },
  { version: 8, sql: COMPOSITION_GOALS_V8 },
  { version: 9, sql: FOOD_PORTION_V9 },
  { version: 10, sql: GOAL_PACE_V10 },
  { version: 11, sql: RECIPES_V11 },
  { version: 12, sql: SHOPPING_V12 },
  { version: 13, sql: CARDIO_SETS_V13 },
];

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
