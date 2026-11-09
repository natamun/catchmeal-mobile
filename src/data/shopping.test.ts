import { beforeEach, describe, expect, it } from 'vitest';

import type { FoodItem } from '../components/food/types';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { DataError } from './errors';
import { createFoodItem } from './foodItems';
import {
  addFoodsToShopping,
  addLabelToShopping,
  clearShopping,
  listShopping,
  removeCheckedShopping,
  removeShoppingItems,
  setShoppingChecked,
} from './shopping';

let db: Database;
let chicken: FoodItem;
let rice: FoodItem;

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
  const food = {
    brand: null,
    barcode: null,
    baseQuantity: 100,
    baseUnit: 'GRAM' as const,
    kcal: 110,
    protein: 23,
    carbs: 0,
    fat: 2,
    portionQuantity: null,
    portionName: null,
  };
  chicken = await createFoodItem(db, { ...food, name: 'Blanc de poulet' });
  rice = await createFoodItem(db, { ...food, name: 'Riz' });
});

const line = (foodItemId: number, quantity: number) => ({
  foodItemId,
  quantity,
});

describe('addFoodsToShopping', () => {
  it('adds the foods to buy, in the order given', async () => {
    const list = await addFoodsToShopping(db, [
      line(chicken.id, 800),
      line(rice.id, 300),
    ]);

    expect(list).toEqual([
      {
        id: expect.any(Number) as number,
        foodItemId: chicken.id,
        label: null,
        quantity: 800,
        checked: false,
      },
      {
        id: expect.any(Number) as number,
        foodItemId: rice.id,
        label: null,
        quantity: 300,
        checked: false,
      },
    ]);
  });

  it('adds up a food already there, back to buy if it was checked', async () => {
    const [first] = await addFoodsToShopping(db, [line(chicken.id, 800)]);
    await setShoppingChecked(db, [first.id], true);

    const list = await addFoodsToShopping(db, [
      line(chicken.id, 400),
      line(rice.id, 300),
      line(chicken.id, 100),
    ]);

    expect(
      list.map(({ foodItemId, quantity, checked }) => [
        foodItemId,
        quantity,
        checked,
      ]),
    ).toEqual([
      [chicken.id, 1300, false],
      [rice.id, 300, false],
    ]);
  });

  it.each([
    ['nothing', []],
    ['a zero quantity', [{ foodItemId: 1, quantity: 0 }]],
    ['a quantity with 3 decimals', [{ foodItemId: 1, quantity: 1.234 }]],
    ['an unknown food', [{ foodItemId: 999, quantity: 10 }]],
  ])('refuses %s and adds nothing', async (_, lines) => {
    await expect(addFoodsToShopping(db, lines)).rejects.toThrow(DataError);
    expect(await listShopping(db)).toEqual([]);
  });
});

describe('addLabelToShopping', () => {
  it('adds a free text, trimmed, after the foods', async () => {
    await addFoodsToShopping(db, [line(rice.id, 300)]);

    const list = await addLabelToShopping(db, '  Sacs poubelle ');

    expect(list[1]).toMatchObject({
      foodItemId: null,
      label: 'Sacs poubelle',
      quantity: null,
    });
  });

  it.each([
    ['a blank text', '   '],
    ['a text over 120 characters', 'a'.repeat(121)],
  ])('refuses %s', async (_, label) => {
    await expect(addLabelToShopping(db, label)).rejects.toThrow(DataError);
    expect(await listShopping(db)).toEqual([]);
  });
});

describe('checking and removing', () => {
  let ids: number[];

  beforeEach(async () => {
    await addFoodsToShopping(db, [line(chicken.id, 800), line(rice.id, 300)]);
    await addLabelToShopping(db, 'Sacs poubelle');
    ids = (await listShopping(db)).map(({ id }) => id);
  });

  it('checks lines and puts them back to buy', async () => {
    await setShoppingChecked(db, [ids[0], ids[2]], true);
    const list = await setShoppingChecked(db, [ids[2]], false);

    expect(list.map(({ checked }) => checked)).toEqual([true, false, false]);
  });

  it('removes some lines, the checked ones, or all of them', async () => {
    await removeShoppingItems(db, [ids[1]]);
    await setShoppingChecked(db, [ids[0]], true);

    expect(await removeCheckedShopping(db)).toEqual([
      expect.objectContaining({ label: 'Sacs poubelle' }),
    ]);
    expect(await clearShopping(db)).toEqual([]);
  });

  it('refuses to check lines that are gone, or no line at all', async () => {
    await clearShopping(db);

    for (const target of [[ids[0]], []]) {
      await expect(setShoppingChecked(db, target, true)).rejects.toThrow(
        "Un des articles n'existe plus.",
      );
    }
  });
});
