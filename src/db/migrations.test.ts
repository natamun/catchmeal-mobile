import { beforeEach, describe, expect, it } from 'vitest';

import { openMemoryDatabase } from '../test/nodeDatabase';
import type { Database, SqlValue } from './database';
import { migrate, MIGRATIONS } from './migrations';
import { STARTER_EXERCISES } from './starterExercises';

type Row = Record<string, SqlValue>;

/** The error SQLite gives when a row breaks a rule of the schema. */
const REFUSED = /constraint failed|cannot store/;

let db: Database;

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
});

async function versionOf(target: Database) {
  const [{ user_version }] = await target.query<{ user_version: number }>(
    'PRAGMA user_version',
  );
  return user_version;
}

function insert(table: string, row: Row) {
  const columns = Object.keys(row);
  return db.run(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    Object.values(row),
  );
}

function updateProfile(changes: Row) {
  const columns = Object.keys(changes);
  return db.run(
    `UPDATE profile SET ${columns.map((c) => `${c} = ?`).join(', ')} WHERE id = 1`,
    Object.values(changes),
  );
}

async function count(table: string) {
  const [{ n }] = await db.query<{ n: number }>(
    `SELECT count(*) AS n FROM ${table}`,
  );
  return n;
}

const FOOD: Row = {
  name: 'Pomme',
  brand: null,
  barcode: '7610200337467',
  base_quantity: 100,
  base_unit: 'GRAM',
  kcal: 52,
  protein: 0.3,
  carbs: 14,
  fat: 0.2,
  archived: 0,
};

const LOGGED_MEAL: Row = {
  name: null,
  type_meal: 'LUNCH',
  logged_at: '2026-11-05',
  source_meal_id: null,
};

const WEIGHT: Row = {
  weight: 72.5,
  body_fat: 18,
  fat_free_mass: 59.4,
  body_water: 55,
  muscle_mass: 33,
  logged_at: '2026-11-05T07:30:00.000Z',
};

const GOAL: Row = {
  daily_calories: 2200,
  daily_protein: 150,
  daily_carbs: 230,
  daily_fat: 70,
  objective: 'lose',
  start_date: '2026-11-05T07:30:00.000Z',
};

describe('migrate', () => {
  it('creates every table on an empty database', async () => {
    const tables = await db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );

    expect(await versionOf(db)).toBe(MIGRATIONS.length);
    expect(tables.map(({ name }) => name)).toEqual([
      'exercise',
      'food_item',
      'goal_setting',
      'meal',
      'meal_item',
      'profile',
      'weight_log',
      'workout',
      'workout_exercise',
      'workout_set',
      'workout_template',
      'workout_template_exercise',
    ]);
    expect(await count('profile')).toBe(1);
  });

  it('does nothing when the schema is already up to date', async () => {
    await migrate(db);

    expect(await versionOf(db)).toBe(MIGRATIONS.length);
    expect(await count('profile')).toBe(1);
  });

  it('applies only the missing steps, in version order', async () => {
    const fresh = openMemoryDatabase();
    const createTable = { version: 1, sql: 'CREATE TABLE a (x INTEGER);\n' };
    const addRow = { version: 2, sql: 'INSERT INTO a VALUES (2);\n' };

    await migrate(fresh, [createTable]);
    await migrate(fresh, [addRow, createTable]);

    expect(await versionOf(fresh)).toBe(2);
    expect(await fresh.query('SELECT x FROM a')).toEqual([{ x: 2 }]);
  });

  it('leaves the database as it was when a step fails', async () => {
    const fresh = openMemoryDatabase();
    const broken = {
      version: 1,
      sql: 'CREATE TABLE a (x INTEGER);\nINSERT INTO missing VALUES (1);\n',
    };

    await expect(migrate(fresh, [broken])).rejects.toThrow();
    expect(await versionOf(fresh)).toBe(0);
    expect(
      await fresh.query("SELECT name FROM sqlite_master WHERE name = 'a'"),
    ).toEqual([]);
  });
});

describe('migration 4', () => {
  it.each([
    ['a theme that no longer exists goes back to the default', 'nuit', null],
    ['graphite stays', 'graphite', 'graphite'],
  ])('%s', async (_, before, after) => {
    const old = openMemoryDatabase();
    await migrate(old, MIGRATIONS.slice(0, 3));
    await old.run(
      "UPDATE profile SET theme = ?, height = 178, goal_type = 'LOSE_FAT' WHERE id = 1",
      [before],
    );

    await migrate(old);

    expect(
      await old.query('SELECT theme, height, goal_type FROM profile'),
    ).toEqual([{ theme: after, height: 178, goal_type: 'LOSE_FAT' }]);
  });
});

describe('migration 5', () => {
  it('starts the exercise library with the usual machines', async () => {
    const exercises = await db.query<Row>(
      'SELECT name, kind, met FROM exercise ORDER BY id',
    );

    expect(exercises).toHaveLength(STARTER_EXERCISES.length);
    expect(exercises).toContainEqual({
      name: 'Presse à cuisses',
      kind: 'STRENGTH',
      met: null,
    });
    expect(exercises).toContainEqual({
      name: 'Tapis de course',
      kind: 'TREADMILL',
      met: null,
    });
    expect(exercises).toContainEqual({
      name: 'Rameur',
      kind: 'CARDIO',
      met: 7,
    });
  });

  it('keeps the data of a database from before the fitness tab', async () => {
    const old = openMemoryDatabase();
    await migrate(old, MIGRATIONS.slice(0, 4));
    await old.run('UPDATE profile SET height = 178 WHERE id = 1');

    await migrate(old);

    expect(await old.query('SELECT height FROM profile')).toEqual([
      { height: 178 },
    ]);
  });
});

describe('migration 6', () => {
  it('keeps the sessions logged before the favorites, without a name', async () => {
    const old = openMemoryDatabase();
    await migrate(old, MIGRATIONS.slice(0, 5));
    await old.run("INSERT INTO workout (performed_on) VALUES ('2026-11-05')");

    await migrate(old);

    expect(await old.query('SELECT performed_on, name FROM workout')).toEqual([
      { performed_on: '2026-11-05', name: null },
    ]);
  });

  it('deletes the exercises of a favorite with it', async () => {
    const { lastId } = await insert('workout_template', { name: 'Full body' });
    await insert('workout_template_exercise', {
      template_id: lastId,
      exercise_id: 1,
      position: 0,
    });

    await db.run('DELETE FROM workout_template WHERE id = ?', [lastId]);

    expect(await count('workout_template_exercise')).toBe(0);
  });

  it('refuses a favorite without a name', async () => {
    await expect(insert('workout_template', { name: '  ' })).rejects.toThrow(
      REFUSED,
    );
  });
});

describe('migration 7', () => {
  it('merges the sessions of a day, an exercise done twice into one line', async () => {
    const old = openMemoryDatabase();
    await migrate(old, MIGRATIONS.slice(0, 6));
    const insertInto = (table: string, row: Row) =>
      old.run(
        `INSERT INTO ${table} (${Object.keys(row).join(', ')}) VALUES (${Object.keys(
          row,
        )
          .map(() => '?')
          .join(', ')})`,
        Object.values(row),
      );
    const morning = await insertInto('workout', {
      performed_on: '2026-11-05',
      name: 'Matin',
      duration_minutes: 30,
    });
    const evening = await insertInto('workout', { performed_on: '2026-11-05' });
    const other = await insertInto('workout', { performed_on: '2026-11-06' });
    const line = (workoutId: number, exerciseId: number, position: number) =>
      insertInto('workout_exercise', {
        workout_id: workoutId,
        exercise_id: exerciseId,
        position,
      });
    const pressAm = await line(morning.lastId, 1, 0);
    await line(morning.lastId, 2, 1);
    const pressPm = await line(evening.lastId, 1, 0);
    await line(evening.lastId, 3, 1);
    await line(other.lastId, 1, 0);
    const set = (lineId: number, position: number, reps: number) =>
      insertInto('workout_set', {
        workout_exercise_id: lineId,
        position,
        reps,
        weight_kg: 80,
      });
    await set(pressAm.lastId, 0, 12);
    await set(pressAm.lastId, 1, 10);
    await set(pressPm.lastId, 0, 8);

    await migrate(old);

    expect(
      await old.query(
        'SELECT id, performed_on, name, duration_minutes FROM workout ORDER BY id',
      ),
    ).toEqual([
      {
        id: morning.lastId,
        performed_on: '2026-11-05',
        name: null,
        duration_minutes: null,
      },
      {
        id: other.lastId,
        performed_on: '2026-11-06',
        name: null,
        duration_minutes: null,
      },
    ]);
    expect(
      await old.query(
        'SELECT exercise_id, position FROM workout_exercise WHERE workout_id = ? ORDER BY position',
        [morning.lastId],
      ),
    ).toEqual([
      { exercise_id: 1, position: 0 },
      { exercise_id: 2, position: 1 },
      { exercise_id: 3, position: 2 },
    ]);
    expect(
      await old.query(
        'SELECT reps, position FROM workout_set WHERE workout_exercise_id = ? ORDER BY position',
        [pressAm.lastId],
      ),
    ).toEqual([
      { reps: 12, position: 0 },
      { reps: 10, position: 1 },
      { reps: 8, position: 2 },
    ]);
  });

  it('refuses a second session on a day and an exercise twice in it', async () => {
    const { lastId } = await insert('workout', { performed_on: '2026-11-05' });
    await insert('workout_exercise', {
      workout_id: lastId,
      exercise_id: 1,
      position: 0,
    });

    await expect(
      insert('workout', { performed_on: '2026-11-05' }),
    ).rejects.toThrow(/UNIQUE/);
    await expect(
      insert('workout_exercise', {
        workout_id: lastId,
        exercise_id: 1,
        position: 1,
      }),
    ).rejects.toThrow(/UNIQUE/);
  });
});

describe('workout', () => {
  async function addWorkout() {
    const { lastId: workoutId } = await insert('workout', {
      performed_on: '2026-11-05',
      duration_minutes: 60,
    });
    const [{ id: exerciseId }] = await db.query<{ id: number }>(
      "SELECT id FROM exercise WHERE kind = 'STRENGTH' LIMIT 1",
    );
    const { lastId: itemId } = await insert('workout_exercise', {
      workout_id: workoutId,
      exercise_id: exerciseId,
      position: 0,
    });
    await insert('workout_set', {
      workout_exercise_id: itemId,
      position: 0,
      reps: 10,
      weight_kg: 60,
    });
    return { workoutId, exerciseId, itemId };
  }

  it('accepts a session with its exercises and sets', async () => {
    await addWorkout();

    expect(await count('workout_set')).toBe(1);
  });

  it('deletes the exercises and sets with their session', async () => {
    const { workoutId } = await addWorkout();

    await db.run('DELETE FROM workout WHERE id = ?', [workoutId]);

    expect(await count('workout_exercise')).toBe(0);
    expect(await count('workout_set')).toBe(0);
  });

  it('refuses to delete an exercise used in a session', async () => {
    const { exerciseId } = await addWorkout();

    await expect(
      db.run('DELETE FROM exercise WHERE id = ?', [exerciseId]),
    ).rejects.toThrow(REFUSED);
  });

  it.each<[string, string, Row]>([
    [
      'an exercise of an unknown kind',
      'exercise',
      { name: 'Yoga', kind: 'YOGA' },
    ],
    ['an exercise without a name', 'exercise', { name: ' ', kind: 'CARDIO' }],
    [
      'a session on a badly written day',
      'workout',
      { performed_on: '5/11/2026' },
    ],
    [
      'a session of 0 minutes',
      'workout',
      { performed_on: '2026-11-05', duration_minutes: 0 },
    ],
  ])('refuses %s', async (_, table, row) => {
    await expect(insert(table, row)).rejects.toThrow(REFUSED);
  });

  it('refuses a set without repetitions', async () => {
    const { itemId } = await addWorkout();

    await expect(
      insert('workout_set', {
        workout_exercise_id: itemId,
        position: 1,
        reps: 0,
        weight_kg: 60,
      }),
    ).rejects.toThrow(REFUSED);
  });
});

describe('profile', () => {
  it('accepts a complete profile', async () => {
    await updateProfile({
      height: 178,
      target_weight: 70,
      daily_calorie_goal: 2200,
      daily_protein_goal: 150,
      daily_carbs_goal: 230,
      daily_fat_goal: 70,
      gender: 'MALE',
      birth_date: '1990-04-12',
      activity_level: 'MODERATELY_ACTIVE',
    });

    expect(await count('profile')).toBe(1);
  });

  it('refuses a second profile', async () => {
    await expect(insert('profile', { id: 2 })).rejects.toThrow(REFUSED);
  });

  it.each<[string, Row]>([
    ['an unknown gender', { gender: 'X' }],
    ['an unknown activity level', { activity_level: 'LAZY' }],
    ['an unknown goal type', { goal_type: 'BULK' }],
    ['a birth date in another format', { birth_date: '12.04.1990' }],
    ['a zero height', { height: 0 }],
    ['a zero target weight', { target_weight: 0 }],
    ['a zero calorie goal', { daily_calorie_goal: 0 }],
    ['a zero protein goal', { daily_protein_goal: 0 }],
    ['a zero carbs goal', { daily_carbs_goal: 0 }],
    ['a zero fat goal', { daily_fat_goal: 0 }],
    ['a decimal calorie goal', { daily_calorie_goal: 2200.5 }],
  ])('refuses %s', async (_, changes) => {
    await expect(updateProfile(changes)).rejects.toThrow(REFUSED);
  });
});

describe('food_item', () => {
  it('accepts a valid food', async () => {
    await insert('food_item', FOOD);

    expect(await count('food_item')).toBe(1);
  });

  it.each<[string, Row]>([
    ['an empty name', { name: '   ' }],
    ['a zero base quantity', { base_quantity: 0 }],
    ['an unknown unit', { base_unit: 'CUP' }],
    ['negative calories', { kcal: -1 }],
    ['negative protein', { protein: -1 }],
    ['negative carbs', { carbs: -1 }],
    ['negative fat', { fat: -1 }],
    ['a barcode with letters', { barcode: '761020033746A' }],
    ['a barcode shorter than 8 digits', { barcode: '1234567' }],
    ['a barcode longer than 14 digits', { barcode: '123456789012345' }],
    ['an archived flag other than 0 or 1', { archived: 2 }],
    ['text in a number column', { kcal: 'beaucoup' }],
  ])('refuses %s', async (_, override) => {
    await expect(insert('food_item', { ...FOOD, ...override })).rejects.toThrow(
      REFUSED,
    );
  });
});

describe('meal', () => {
  it('accepts a logged meal and a library meal', async () => {
    await insert('meal', LOGGED_MEAL);
    await insert('meal', { name: 'Bircher', type_meal: null, logged_at: null });

    expect(await count('meal')).toBe(2);
  });

  it.each<[string, Row]>([
    ['a logged meal without a type', { type_meal: null }],
    ['an unknown meal type', { type_meal: 'BRUNCH' }],
    ['a day in another format', { logged_at: '05.11.2026' }],
    ['an unknown source meal', { source_meal_id: 999 }],
  ])('refuses %s', async (_, override) => {
    await expect(
      insert('meal', { ...LOGGED_MEAL, ...override }),
    ).rejects.toThrow(REFUSED);
  });

  it('forgets the source meal when it is deleted', async () => {
    const { lastId: sourceId } = await insert('meal', {
      name: 'Bircher',
      type_meal: null,
      logged_at: null,
    });
    const { lastId } = await insert('meal', {
      ...LOGGED_MEAL,
      source_meal_id: sourceId,
    });

    await db.run('DELETE FROM meal WHERE id = ?', [sourceId]);

    const [meal] = await db.query<{ source_meal_id: number | null }>(
      'SELECT source_meal_id FROM meal WHERE id = ?',
      [lastId],
    );
    expect(meal.source_meal_id).toBeNull();
  });
});

describe('meal_item', () => {
  let mealId: number;
  let foodId: number;
  let item: Row;

  beforeEach(async () => {
    mealId = (await insert('meal', LOGGED_MEAL)).lastId;
    foodId = (await insert('food_item', FOOD)).lastId;
    item = {
      meal_id: mealId,
      food_item_id: foodId,
      quantity: 150,
      kcal: 78,
      protein: 0.45,
      carbs: 21,
      fat: 0.3,
    };
  });

  it('accepts a food line and a quick add without food', async () => {
    await insert('meal_item', item);
    await insert('meal_item', { ...item, food_item_id: null });

    expect(await count('meal_item')).toBe(2);
  });

  it.each<[string, Row]>([
    ['a zero quantity', { quantity: 0 }],
    ['negative calories', { kcal: -1 }],
    ['negative protein', { protein: -1 }],
    ['negative carbs', { carbs: -1 }],
    ['negative fat', { fat: -1 }],
    ['an unknown meal', { meal_id: 999 }],
    ['an unknown food', { food_item_id: 999 }],
  ])('refuses %s', async (_, override) => {
    await expect(insert('meal_item', { ...item, ...override })).rejects.toThrow(
      REFUSED,
    );
  });

  it('deletes the lines with their meal', async () => {
    await insert('meal_item', item);

    await db.run('DELETE FROM meal WHERE id = ?', [mealId]);

    expect(await count('meal_item')).toBe(0);
  });

  it('refuses to delete a food used in a meal', async () => {
    await insert('meal_item', item);

    await expect(
      db.run('DELETE FROM food_item WHERE id = ?', [foodId]),
    ).rejects.toThrow(REFUSED);
  });
});

describe('weight_log', () => {
  it('accepts a complete weigh-in', async () => {
    await insert('weight_log', WEIGHT);

    expect(await count('weight_log')).toBe(1);
  });

  it.each<[string, Row]>([
    ['a zero weight', { weight: 0 }],
    ['a zero body fat', { body_fat: 0 }],
    ['a body fat over 100 %', { body_fat: 101 }],
    ['a zero fat-free mass', { fat_free_mass: 0 }],
    ['a zero body water', { body_water: 0 }],
    ['a body water over 100 %', { body_water: 101 }],
    ['a zero muscle mass', { muscle_mass: 0 }],
    ['a missing date', { logged_at: null }],
  ])('refuses %s', async (_, override) => {
    await expect(
      insert('weight_log', { ...WEIGHT, ...override }),
    ).rejects.toThrow(REFUSED);
  });
});

describe('goal_setting', () => {
  it('accepts a goal', async () => {
    await insert('goal_setting', GOAL);

    expect(await count('goal_setting')).toBe(1);
  });

  it.each<[string, Row]>([
    ['zero calories', { daily_calories: 0 }],
    ['a zero protein goal', { daily_protein: 0 }],
    ['a zero carbs goal', { daily_carbs: 0 }],
    ['a zero fat goal', { daily_fat: 0 }],
    ['an unknown objective', { objective: 'keep' }],
    ['a missing start date', { start_date: null }],
  ])('refuses %s', async (_, override) => {
    await expect(
      insert('goal_setting', { ...GOAL, ...override }),
    ).rejects.toThrow(REFUSED);
  });
});
