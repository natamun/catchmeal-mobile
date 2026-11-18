import { beforeEach, describe, expect, it } from 'vitest';

import type { FoodItem } from '../components/food/types';
import type { MealInput, MealItemInput } from '../components/meal/types';
import type { CookInput, Recipe } from '../components/recipe/types';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { cookRecipe, discardBatch, listLeftovers } from './batches';
import { createFoodItem } from './foodItems';
import { createMeal, listMeals, replaceLoggedLines } from './meals';
import { createRecipe, updateRecipe } from './recipes';

let db: Database;
let dough: FoodItem;
let ham: FoodItem;
let pizza: Recipe;

const food = (name: string, kcal: number) => ({
  name,
  brand: null,
  barcode: null,
  baseQuantity: 100,
  baseUnit: 'GRAM' as const,
  kcal,
  protein: 10,
  carbs: 0,
  fat: 0,
  portionQuantity: null,
  portionName: null,
});

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
  dough = await createFoodItem(db, food('Pâte à pizza', 200));
  ham = await createFoodItem(db, food('Jambon', 100));
  // 800 g of dough: 1600 kcal, 400 kcal a serving.
  pizza = await createRecipe(db, {
    name: 'Pizza',
    servings: 4,
    category: 'MAIN',
    prepMinutes: null,
    cooking: null,
    notes: null,
    ingredients: [{ foodItemId: dough.id, quantity: 800 }],
    steps: [],
  });
});

const dinner = (items: MealItemInput[], day = '2026-11-18'): MealInput => ({
  typeMeal: 'DINNER',
  loggedAt: day,
  items,
});

// The pizza with 200 g of ham: 1800 kcal, 450 kcal a serving.
const withHam = (servings = 4): CookInput => ({
  servings,
  ingredients: [
    { foodItemId: dough.id, quantity: 800 },
    { foodItemId: ham.id, quantity: 200 },
  ],
});

async function onlyLeftover() {
  const leftovers = await listLeftovers(db);
  expect(leftovers).toHaveLength(1);
  return leftovers[0];
}

describe('a recipe logged in the journal', () => {
  it('leaves the servings not eaten as a leftover', async () => {
    const meal = await createMeal(
      db,
      dinner([{ recipeId: pizza.id, quantity: 1.5 }]),
    );

    const leftover = await onlyLeftover();
    expect(leftover).toMatchObject({
      recipeId: pizza.id,
      name: 'Pizza',
      cookedOn: '2026-11-18',
      servings: 4,
      remaining: 2.5,
      adapted: false,
      discarded: false,
      totals: { kcal: 1600 },
    });
    expect(meal.items[0]).toMatchObject({ batchId: leftover.id, kcal: 600 });
  });

  it('leaves nothing when all its servings are eaten', async () => {
    const meal = await createMeal(
      db,
      dinner([{ recipeId: pizza.id, quantity: 4 }]),
    );

    expect(meal.items[0].batchId).toBeNull();
    expect(await listLeftovers(db)).toEqual([]);
  });

  it('leaves nothing from a library meal', async () => {
    await createMeal(db, {
      name: 'Soirée pizza',
      items: [{ recipeId: pizza.id, quantity: 1 }],
    });

    expect(await listLeftovers(db)).toEqual([]);
  });

  it('leaves nothing when a journal line is only edited', async () => {
    const meal = await createMeal(
      db,
      dinner([{ recipeId: pizza.id, quantity: 4 }]),
    );

    await replaceLoggedLines(db, [meal.items[0].id], {
      recipeId: pizza.id,
      quantity: 3,
    });

    expect(await listLeftovers(db)).toEqual([]);
  });

  it('keeps the leftover values of that day when the recipe changes', async () => {
    await createMeal(db, dinner([{ recipeId: pizza.id, quantity: 1 }]));
    await updateRecipe(db, pizza.id, {
      name: 'Pizza',
      servings: 2,
      category: 'MAIN',
      prepMinutes: null,
      cooking: null,
      notes: null,
      ingredients: [{ foodItemId: dough.id, quantity: 100 }],
      steps: [],
    });

    expect(await onlyLeftover()).toMatchObject({
      servings: 4,
      remaining: 3,
      totals: { kcal: 1600 },
    });
  });
});

describe('a recipe adapted this time', () => {
  it('takes its values from the adapted ingredients and leaves the recipe as it is', async () => {
    const meal = await createMeal(
      db,
      dinner([{ recipeId: pizza.id, quantity: 1, adapted: withHam() }]),
    );

    expect(meal.items[0].kcal).toBe(450);
    expect(await onlyLeftover()).toMatchObject({
      adapted: true,
      remaining: 3,
      totals: { kcal: 1800 },
    });
    const [recipe] = await db.query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM recipe_ingredient WHERE recipe_id = ?',
      [pizza.id],
    );
    expect(recipe.count).toBe(1);
  });

  it('is not marked adapted when nothing changed', async () => {
    await createMeal(
      db,
      dinner([
        {
          recipeId: pizza.id,
          quantity: 1,
          adapted: {
            servings: 4,
            ingredients: [{ foodItemId: dough.id, quantity: 800 }],
          },
        },
      ]),
    );

    expect((await onlyLeftover()).adapted).toBe(false);
  });

  it('is marked adapted when only its servings changed', async () => {
    await createMeal(
      db,
      dinner([
        {
          recipeId: pizza.id,
          quantity: 1,
          adapted: {
            servings: 6,
            ingredients: [{ foodItemId: dough.id, quantity: 800 }],
          },
        },
      ]),
    );

    expect(await onlyLeftover()).toMatchObject({ adapted: true, remaining: 5 });
  });

  // Functions: the foods only exist once each test has started.
  it.each<[string, () => CookInput]>([
    ['no serving', () => withHam(0)],
    ['half a serving', () => withHam(2.5)],
    ['no ingredient', () => ({ servings: 4, ingredients: [] })],
    [
      'an unknown food',
      () => ({ servings: 4, ingredients: [{ foodItemId: 999, quantity: 1 }] }),
    ],
  ])('refuses %s and saves nothing', async (_, cook) => {
    const adapted = cook();
    await expect(
      createMeal(db, dinner([{ recipeId: pizza.id, quantity: 1, adapted }])),
    ).rejects.toThrow();
    expect(await listMeals(db)).toEqual([]);
    expect(await listLeftovers(db)).toEqual([]);
  });

  it('refuses more servings than it makes', async () => {
    await expect(
      createMeal(
        db,
        dinner([{ recipeId: pizza.id, quantity: 3, adapted: withHam(2) }]),
      ),
    ).rejects.toThrow('Il ne reste pas autant de portions');
    expect(await listMeals(db)).toEqual([]);
  });

  it('refuses to go in a library meal', async () => {
    await expect(
      createMeal(db, {
        name: 'Soirée pizza',
        items: [{ recipeId: pizza.id, quantity: 1, adapted: withHam() }],
      }),
    ).rejects.toThrow('va dans le journal');
  });

  it('refuses an adapted recipe when a journal line is edited', async () => {
    const meal = await createMeal(
      db,
      dinner([{ recipeId: pizza.id, quantity: 4 }]),
    );

    await expect(
      replaceLoggedLines(db, [meal.items[0].id], {
        recipeId: pizza.id,
        quantity: 1,
        adapted: withHam(),
      }),
    ).rejects.toThrow('se mange le jour même');
  });

  it('refuses an adapted line that is not a recipe', async () => {
    await expect(
      createMeal(
        db,
        dinner([{ foodItemId: dough.id, quantity: 100, adapted: withHam() }]),
      ),
    ).rejects.toThrow('Seule une recette peut être adaptée.');
  });
});

describe('a leftover logged in the journal', () => {
  let batchId: number;

  beforeEach(async () => {
    await createMeal(
      db,
      dinner([{ recipeId: pizza.id, quantity: 1, adapted: withHam() }]),
    );
    ({ id: batchId } = await onlyLeftover());
  });

  it('takes its servings of the batch values', async () => {
    const meal = await createMeal(
      db,
      dinner([{ batchId, quantity: 2 }], '2026-11-19'),
    );

    expect(meal.items[0]).toMatchObject({
      recipeId: pizza.id,
      batchId,
      quantity: 2,
      kcal: 900,
    });
    expect((await onlyLeftover()).remaining).toBe(1);
  });

  it('leaves the list once all its servings are eaten', async () => {
    await createMeal(db, dinner([{ batchId, quantity: 3 }], '2026-11-19'));

    expect(await listLeftovers(db)).toEqual([]);
  });

  it('refuses more servings than are left and saves nothing', async () => {
    await expect(
      createMeal(db, dinner([{ batchId, quantity: 3.5 }], '2026-11-19')),
    ).rejects.toThrow('Il ne reste pas autant de portions');
    expect(await listMeals(db, { date: '2026-11-19' })).toEqual([]);
  });

  it('counts the servings of the line edited as available', async () => {
    const meal = await createMeal(
      db,
      dinner([{ batchId, quantity: 2 }], '2026-11-19'),
    );

    await replaceLoggedLines(db, [meal.items[0].id], { batchId, quantity: 3 });
    expect(await listLeftovers(db)).toEqual([]);

    await expect(
      replaceLoggedLines(db, [meal.items[0].id], { batchId, quantity: 3.5 }),
    ).rejects.toThrow('Il ne reste pas autant de portions');
  });

  it('gives its servings back when the line is removed', async () => {
    const meal = await createMeal(
      db,
      dinner([{ batchId, quantity: 2 }], '2026-11-19'),
    );

    await replaceLoggedLines(db, [meal.items[0].id], null);

    expect((await onlyLeftover()).remaining).toBe(3);
  });

  it('refuses to go in a library meal', async () => {
    await expect(
      createMeal(db, { name: 'Restes', items: [{ batchId, quantity: 1 }] }),
    ).rejects.toThrow('va dans le journal');
  });

  it.each<[string, MealItemInput]>([
    ['an unknown leftover', { batchId: 999, quantity: 1 }],
    [
      'a line both a leftover and a food',
      { batchId: 1, foodItemId: 1, quantity: 1 },
    ],
    [
      'a line both a leftover and a recipe',
      { batchId: 1, recipeId: 1, quantity: 1 },
    ],
  ])('refuses %s', async (_, item) => {
    await expect(createMeal(db, dinner([item]))).rejects.toThrow();
  });
});

describe('cookRecipe', () => {
  it('turns all the servings into a leftover', async () => {
    const batch = await cookRecipe(db, pizza.id, withHam(), '2026-11-18');

    expect(batch).toMatchObject({ remaining: 4, adapted: true });
    expect(await listMeals(db)).toEqual([]);
    expect(await listLeftovers(db)).toEqual([batch]);
  });

  it('refuses an unknown recipe', async () => {
    await expect(cookRecipe(db, 999, withHam(), '2026-11-18')).rejects.toThrow(
      "Cette recette n'existe plus.",
    );
  });

  it('refuses a day in another format', async () => {
    await expect(
      cookRecipe(db, pizza.id, withHam(), '18.11.2026'),
    ).rejects.toThrow();
  });

  it('lists the newest cooked first', async () => {
    await cookRecipe(db, pizza.id, withHam(), '2026-11-16');
    await cookRecipe(db, pizza.id, withHam(), '2026-11-18');

    expect((await listLeftovers(db)).map(({ cookedOn }) => cookedOn)).toEqual([
      '2026-11-18',
      '2026-11-16',
    ]);
  });
});

describe('discardBatch', () => {
  it('deletes a batch nothing was logged from', async () => {
    const batch = await cookRecipe(db, pizza.id, withHam(), '2026-11-18');

    await discardBatch(db, batch.id);

    const [{ count }] = await db.query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM batch',
    );
    expect(count).toBe(0);
  });

  it('keeps the journal lines of a batch already eaten from', async () => {
    await createMeal(db, dinner([{ recipeId: pizza.id, quantity: 1 }]));
    const { id } = await onlyLeftover();

    await discardBatch(db, id);

    expect(await listLeftovers(db)).toEqual([]);
    const [meal] = await listMeals(db);
    expect(meal.items[0]).toMatchObject({ batchId: id, kcal: 400 });
  });

  it('refuses new servings of a discarded batch but lets a line shrink', async () => {
    const meal = await createMeal(
      db,
      dinner([{ recipeId: pizza.id, quantity: 2 }]),
    );
    const { id } = await onlyLeftover();
    await discardBatch(db, id);

    await expect(
      createMeal(db, dinner([{ batchId: id, quantity: 1 }], '2026-11-19')),
    ).rejects.toThrow('Ces portions préparées ont été retirées.');
    await replaceLoggedLines(db, [meal.items[0].id], {
      batchId: id,
      quantity: 1,
    });
  });

  it('refuses a leftover already discarded or unknown', async () => {
    await createMeal(db, dinner([{ recipeId: pizza.id, quantity: 1 }]));
    const { id } = await onlyLeftover();
    await discardBatch(db, id);

    await expect(discardBatch(db, id)).rejects.toThrow(
      "Ces portions préparées n'existent plus.",
    );
    await expect(discardBatch(db, 999)).rejects.toThrow(
      "Ces portions préparées n'existent plus.",
    );
  });
});
