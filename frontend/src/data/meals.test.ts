import { beforeEach, describe, expect, it } from 'vitest';

import type { FoodItem } from '../components/food/types';
import type { MealInput, MealItemInput } from '../components/meal/types';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { DataError } from './errors';
import { archiveFoodItem, createFoodItem, updateFoodItem } from './foodItems';
import { createMeal, deleteMeal, listMeals, updateMeal } from './meals';

let db: Database;
let apple: FoodItem;
let yogurt: FoodItem;

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
  apple = await createFoodItem(db, {
    name: 'Pomme',
    brand: null,
    barcode: null,
    baseQuantity: 100,
    baseUnit: 'GRAM',
    kcal: 52,
    protein: 0.3,
    carbs: 14,
    fat: 0.2,
  });
  yogurt = await createFoodItem(db, {
    name: 'Yogourt',
    brand: null,
    barcode: null,
    baseQuantity: 1,
    baseUnit: 'PIECE',
    kcal: 120,
    protein: 5,
    carbs: 16,
    fat: 3.5,
  });
});

const QUICK_ADD: MealItemInput = {
  quantity: 1,
  kcal: 250,
  protein: 10,
  carbs: 30,
  fat: 8,
};

const lunch = (items: MealItemInput[], day = '2026-11-05'): MealInput => ({
  typeMeal: 'LUNCH',
  loggedAt: day,
  items,
});

describe('createMeal', () => {
  it('scales the food values to the quantity eaten', async () => {
    const meal = await createMeal(
      db,
      lunch([
        { foodItemId: apple.id, quantity: 150 },
        { foodItemId: yogurt.id, quantity: 2 },
      ]),
    );

    expect(meal).toMatchObject({
      name: null,
      typeMeal: 'LUNCH',
      loggedAt: '2026-11-05',
    });
    expect(meal.items).toEqual([
      {
        id: expect.any(Number) as number,
        foodItemId: apple.id,
        quantity: 150,
        kcal: 78,
        protein: expect.closeTo(0.45, 5) as number,
        carbs: 21,
        fat: expect.closeTo(0.3, 5) as number,
      },
      {
        id: expect.any(Number) as number,
        foodItemId: yogurt.id,
        quantity: 2,
        kcal: 240,
        protein: 10,
        carbs: 32,
        fat: 7,
      },
    ]);
  });

  it('keeps the values given for a quick add, next to food lines', async () => {
    const meal = await createMeal(
      db,
      lunch([QUICK_ADD, { foodItemId: apple.id, quantity: 100 }]),
    );

    expect(
      meal.items.map(({ foodItemId, kcal }) => [foodItemId, kcal]),
    ).toEqual([
      [null, 250],
      [apple.id, 52],
    ]);
  });

  it('saves a library meal without day nor type, its name trimmed', async () => {
    const meal = await createMeal(db, {
      name: '  Bircher ',
      items: [{ foodItemId: apple.id, quantity: 80 }],
    });

    expect(meal).toMatchObject({
      name: 'Bircher',
      typeMeal: null,
      loggedAt: null,
    });
  });

  it('stores a blank name as no name', async () => {
    const meal = await createMeal(db, { ...lunch([QUICK_ADD]), name: '   ' });

    expect(meal.name).toBeNull();
  });

  it('keeps past meals unchanged when the food is edited later', async () => {
    const meal = await createMeal(
      db,
      lunch([{ foodItemId: apple.id, quantity: 100 }]),
    );
    await updateFoodItem(db, apple.id, { ...apple, kcal: 999 });

    const [saved] = await listMeals(db, { date: '2026-11-05' });

    expect(saved.items[0].kcal).toBe(52);
    expect(saved.id).toBe(meal.id);
  });

  it.each<[string, Partial<MealInput>]>([
    ['a journal meal without type', { typeMeal: undefined }],
    [
      'an unknown type',
      { typeMeal: 'BRUNCH' as unknown as MealInput['typeMeal'] },
    ],
    ['a day that does not exist', { loggedAt: '2026-02-30' }],
    ['a day carrying a time', { loggedAt: '2026-11-05T10:00' }],
    ['a name over 120 characters', { name: 'a'.repeat(121) }],
    ['no line', { items: [] }],
    ['a zero quantity', { items: [{ foodItemId: 1, quantity: 0 }] }],
    [
      'a quantity with 3 decimals',
      { items: [{ ...QUICK_ADD, quantity: 1.234 }] },
    ],
    [
      'a quick add without calories',
      { items: [{ ...QUICK_ADD, kcal: undefined }] },
    ],
    ['a quick add with negative fat', { items: [{ ...QUICK_ADD, fat: -1 }] }],
    ['an unknown food', { items: [{ foodItemId: 999, quantity: 10 }] }],
  ])('refuses %s and saves nothing', async (_, override) => {
    await expect(
      createMeal(db, { ...lunch([QUICK_ADD]), ...override }),
    ).rejects.toThrow(DataError);
    expect(await listMeals(db)).toEqual([]);
  });

  it('refuses an archived food that no meal holds', async () => {
    await archiveFoodItem(db, apple.id);

    await expect(
      createMeal(db, lunch([{ foodItemId: apple.id, quantity: 100 }])),
    ).rejects.toThrow("Un des aliments n'existe plus.");
  });
});

describe('listMeals', () => {
  beforeEach(async () => {
    await createMeal(db, lunch([QUICK_ADD], '2026-11-04'));
    await createMeal(db, { name: 'Bircher', items: [QUICK_ADD] });
    await createMeal(db, lunch([QUICK_ADD], '2026-11-05'));
  });

  it('lists every meal, the newest first', async () => {
    const all = await listMeals(db);

    expect(all.map(({ loggedAt }) => loggedAt)).toEqual([
      '2026-11-05',
      null,
      '2026-11-04',
    ]);
  });

  it('lists only the journal or only the library meals', async () => {
    expect((await listMeals(db, { logged: true })).length).toBe(2);
    expect(
      (await listMeals(db, { logged: false })).map(({ name }) => name),
    ).toEqual(['Bircher']);
  });

  it('lists the journal meals of one day with their lines', async () => {
    const day = await listMeals(db, { date: '2026-11-04' });

    expect(day).toHaveLength(1);
    expect(day[0].items).toHaveLength(1);
  });

  it('refuses a day in another format', async () => {
    await expect(listMeals(db, { date: '04.11.2026' })).rejects.toThrow(
      DataError,
    );
  });
});

describe('updateMeal', () => {
  it('replaces all the lines and keeps the other fields', async () => {
    const meal = await createMeal(db, {
      ...lunch([QUICK_ADD]),
      name: 'Midi',
    });

    const updated = await updateMeal(db, meal.id, {
      items: [{ foodItemId: apple.id, quantity: 200 }],
    });

    expect(updated).toMatchObject({
      name: 'Midi',
      typeMeal: 'LUNCH',
      loggedAt: '2026-11-05',
    });
    expect(updated.items.map(({ kcal }) => kcal)).toEqual([104]);
  });

  it('clears the name when given null', async () => {
    const meal = await createMeal(db, { ...lunch([QUICK_ADD]), name: 'Midi' });

    expect((await updateMeal(db, meal.id, { name: null })).name).toBeNull();
  });

  it('moves a journal meal to another day', async () => {
    const meal = await createMeal(db, lunch([QUICK_ADD]));

    const moved = await updateMeal(db, meal.id, { loggedAt: '2026-11-06' });

    expect(moved.loggedAt).toBe('2026-11-06');
  });

  it('keeps an archived food that the meal already holds', async () => {
    const meal = await createMeal(
      db,
      lunch([{ foodItemId: apple.id, quantity: 100 }]),
    );
    await archiveFoodItem(db, apple.id);

    const updated = await updateMeal(db, meal.id, {
      items: [{ foodItemId: apple.id, quantity: 50 }, QUICK_ADD],
    });

    expect(updated.items).toHaveLength(2);
  });

  it('refuses to remove the type of a journal meal', async () => {
    const meal = await createMeal(db, lunch([QUICK_ADD]));

    await expect(updateMeal(db, meal.id, { typeMeal: null })).rejects.toThrow(
      'Le type de repas est obligatoire.',
    );
  });

  it('refuses to log a library meal that has no type', async () => {
    const meal = await createMeal(db, { name: 'Bircher', items: [QUICK_ADD] });

    await expect(
      updateMeal(db, meal.id, { loggedAt: '2026-11-05' }),
    ).rejects.toThrow(DataError);
  });

  it('keeps the old lines when the new ones are refused', async () => {
    const meal = await createMeal(db, lunch([QUICK_ADD]));

    await expect(
      updateMeal(db, meal.id, { items: [{ foodItemId: 999, quantity: 1 }] }),
    ).rejects.toThrow(DataError);

    const [saved] = await listMeals(db);
    expect(saved.items).toEqual(meal.items);
  });

  it('refuses an unknown meal', async () => {
    await expect(updateMeal(db, 999, { name: 'x' })).rejects.toThrow(
      "Ce repas n'existe plus.",
    );
  });
});

describe('deleteMeal', () => {
  it('deletes the meal and its lines', async () => {
    const meal = await createMeal(db, lunch([QUICK_ADD, QUICK_ADD]));

    await deleteMeal(db, meal.id);

    expect(await listMeals(db)).toEqual([]);
    expect(
      await db.query('SELECT id FROM meal_item WHERE meal_id = ?', [meal.id]),
    ).toEqual([]);
  });

  it('refuses an unknown meal', async () => {
    await expect(deleteMeal(db, 999)).rejects.toThrow(DataError);
  });
});
