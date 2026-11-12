import { beforeEach, describe, expect, it } from 'vitest';

import type { FoodItemInput } from '../components/food/types';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { DataError } from './errors';
import {
  archiveFoodItem,
  createFoodItem,
  listFoodItems,
  listFoodUsage,
  updateFoodItem,
} from './foodItems';
import { createMeal } from './meals';

let db: Database;

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
});

const APPLE: FoodItemInput = {
  name: 'Pomme',
  brand: null,
  barcode: null,
  baseQuantity: 100,
  baseUnit: 'GRAM',
  kcal: 52,
  protein: 0.3,
  carbs: 14,
  fat: 0.2,
  portionQuantity: null,
  portionName: null,
};

describe('createFoodItem', () => {
  it('saves the food and returns it with its id', async () => {
    const food = await createFoodItem(db, APPLE);

    expect(food).toEqual({ ...APPLE, id: food.id, archived: false });
    expect(await listFoodItems(db)).toEqual([food]);
  });

  it('trims the texts and stores an empty brand as null', async () => {
    const food = await createFoodItem(db, {
      ...APPLE,
      name: '  Pomme Gala ',
      brand: '   ',
      barcode: ' 7610200337467 ',
    });

    expect(food.name).toBe('Pomme Gala');
    expect(food.brand).toBeNull();
    expect(food.barcode).toBe('7610200337467');
  });

  it('saves a portion with its name trimmed, and none without its weight', async () => {
    const biscuits = await createFoodItem(db, {
      ...APPLE,
      name: 'Biscuits',
      portionQuantity: 12,
      portionName: '  biscuit ',
    });
    const cereals = await createFoodItem(db, {
      ...APPLE,
      name: 'Céréales',
      portionQuantity: 30,
      portionName: '  ',
    });
    const rice = await createFoodItem(db, {
      ...APPLE,
      name: 'Riz',
      portionName: 'bol',
    });

    expect(biscuits).toMatchObject({
      portionQuantity: 12,
      portionName: 'biscuit',
    });
    expect(cereals).toMatchObject({ portionQuantity: 30, portionName: null });
    expect(rice).toMatchObject({ portionQuantity: null, portionName: null });
  });

  it.each<[string, Partial<FoodItemInput>]>([
    ['an empty name', { name: '  ' }],
    ['a name over 120 characters', { name: 'a'.repeat(121) }],
    ['a brand over 80 characters', { brand: 'b'.repeat(81) }],
    ['a barcode with letters', { barcode: '761020033746A' }],
    ['a barcode of 7 digits', { barcode: '1234567' }],
    ['a zero base quantity', { baseQuantity: 0 }],
    ['negative calories', { kcal: -1 }],
    ['negative protein', { protein: -0.5 }],
    ['negative carbs', { carbs: -2 }],
    ['negative fat', { fat: -3 }],
    ['3 decimals', { kcal: 52.123 }],
    ['a portion of 0 g', { portionQuantity: 0 }],
    ['a portion over 5000 g', { portionQuantity: 5001 }],
    [
      'a portion name over 30 characters',
      { portionQuantity: 12, portionName: 'x'.repeat(31) },
    ],
    [
      'a portion of a food by the piece',
      { baseUnit: 'PIECE', baseQuantity: 1, portionQuantity: 12 },
    ],
    ['a value that is not a number', { kcal: NaN }],
    [
      'an unknown unit',
      { baseUnit: 'CUP' as unknown as FoodItemInput['baseUnit'] },
    ],
  ])('refuses %s', async (_, override) => {
    await expect(createFoodItem(db, { ...APPLE, ...override })).rejects.toThrow(
      DataError,
    );
    expect(await listFoodItems(db)).toEqual([]);
  });
});

describe('listFoodItems', () => {
  it('sorts by name, ignoring case and accents', async () => {
    for (const name of ['pomme', 'Œuf', 'Écrevisse', 'abricot', 'Banane']) {
      await createFoodItem(db, { ...APPLE, name });
    }

    const names = (await listFoodItems(db)).map(({ name }) => name);

    expect(names).toEqual(['abricot', 'Banane', 'Écrevisse', 'Œuf', 'pomme']);
  });

  it('keeps archived foods, marked as archived', async () => {
    const food = await createFoodItem(db, APPLE);
    await archiveFoodItem(db, food.id);

    expect(await listFoodItems(db)).toEqual([{ ...food, archived: true }]);
  });
});

describe('updateFoodItem', () => {
  it('saves the new values', async () => {
    const food = await createFoodItem(db, APPLE);

    const updated = await updateFoodItem(db, food.id, {
      ...APPLE,
      name: 'Pomme verte',
      kcal: 48,
    });

    expect(updated).toEqual({ ...food, name: 'Pomme verte', kcal: 48 });
  });

  it('refuses invalid values and keeps the old ones', async () => {
    const food = await createFoodItem(db, APPLE);

    await expect(
      updateFoodItem(db, food.id, { ...APPLE, kcal: -1 }),
    ).rejects.toThrow(DataError);
    expect(await listFoodItems(db)).toEqual([food]);
  });

  it('refuses an archived food', async () => {
    const food = await createFoodItem(db, APPLE);
    await archiveFoodItem(db, food.id);

    await expect(
      updateFoodItem(db, food.id, { ...APPLE, kcal: 10 }),
    ).rejects.toThrow("Cet aliment n'existe plus.");
  });

  it('refuses an unknown food', async () => {
    await expect(updateFoodItem(db, 999, APPLE)).rejects.toThrow(DataError);
  });
});

describe('archiveFoodItem', () => {
  it('archives the food', async () => {
    const food = await createFoodItem(db, APPLE);

    expect(await archiveFoodItem(db, food.id)).toEqual({
      ...food,
      archived: true,
    });
  });

  it('refuses a food already archived', async () => {
    const food = await createFoodItem(db, APPLE);
    await archiveFoodItem(db, food.id);

    await expect(archiveFoodItem(db, food.id)).rejects.toThrow(DataError);
  });

  it('refuses an unknown food', async () => {
    await expect(archiveFoodItem(db, 999)).rejects.toThrow(DataError);
  });
});

describe('listFoodUsage', () => {
  const log = (foodItemId: number, quantity: number, day: string) =>
    createMeal(db, {
      typeMeal: 'LUNCH',
      loggedAt: day,
      items: [{ foodItemId, quantity }],
    });

  it('counts the journal logs of each food, with the latest one', async () => {
    const apple = await createFoodItem(db, APPLE);
    await log(apple.id, 150, '2026-11-10');
    await log(apple.id, 200, '2026-09-01');
    await log(apple.id, 120, '2026-11-10');
    await log(apple.id, 80, '2026-06-01');

    expect(await listFoodUsage(db, '2026-11-12')).toEqual([
      {
        foodItemId: apple.id,
        count: 4,
        last30Days: 2,
        last90Days: 3,
        lastDay: '2026-11-10',
        lastQuantity: 120,
      },
    ]);
  });

  it('counts the 30 and 90 days back from today, today included', async () => {
    const apple = await createFoodItem(db, APPLE);
    await log(apple.id, 100, '2026-11-12');
    await log(apple.id, 100, '2026-10-14');
    await log(apple.id, 100, '2026-10-13');
    await log(apple.id, 100, '2026-08-15');
    await log(apple.id, 100, '2026-08-14');

    const [usage] = await listFoodUsage(db, '2026-11-12');

    expect(usage.last30Days).toBe(2);
    expect(usage.last90Days).toBe(4);
  });

  it('leaves out the library meals and the foods never logged', async () => {
    const apple = await createFoodItem(db, APPLE);
    await createFoodItem(db, { ...APPLE, name: 'Poire' });
    await createMeal(db, {
      name: 'Goûter',
      items: [{ foodItemId: apple.id, quantity: 100 }],
    });

    expect(await listFoodUsage(db, '2026-11-12')).toEqual([]);
  });

  it('refuses a malformed day', async () => {
    await expect(listFoodUsage(db, '2026-13-01')).rejects.toThrow(DataError);
  });
});
