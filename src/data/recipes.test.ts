import { beforeEach, describe, expect, it } from 'vitest';

import type { FoodItem } from '../components/food/types';
import type { RecipeInput } from '../components/recipe/types';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { DataError } from './errors';
import { archiveFoodItem, createFoodItem, updateFoodItem } from './foodItems';
import {
  archiveRecipe,
  createRecipe,
  listRecipes,
  updateRecipe,
} from './recipes';

let db: Database;
let chicken: FoodItem;
let egg: FoodItem;

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
  chicken = await createFoodItem(db, {
    name: 'Blanc de poulet',
    brand: null,
    barcode: null,
    baseQuantity: 100,
    baseUnit: 'GRAM',
    kcal: 110,
    protein: 23,
    carbs: 0,
    fat: 2,
    portionQuantity: null,
    portionName: null,
  });
  egg = await createFoodItem(db, {
    name: 'Œuf',
    brand: null,
    barcode: null,
    baseQuantity: 1,
    baseUnit: 'PIECE',
    kcal: 70,
    protein: 6,
    carbs: 0.5,
    fat: 5,
    portionQuantity: null,
    portionName: null,
  });
});

const curry = (override: Partial<RecipeInput> = {}): RecipeInput => ({
  name: 'Curry de poulet',
  servings: 4,
  category: 'MAIN',
  prepMinutes: 35,
  cooking: '20 min à feu doux.',
  notes: 'Le poulet se remplace par de la dinde.',
  ingredients: [
    { foodItemId: chicken.id, quantity: 800 },
    { foodItemId: egg.id, quantity: 2 },
  ],
  steps: ['Couper le poulet.', 'Faire revenir avec le curry.'],
  ...override,
});

describe('createRecipe', () => {
  it('saves the recipe and adds up its foods scaled to their quantity', async () => {
    const recipe = await createRecipe(db, curry());

    expect(recipe).toEqual({
      id: expect.any(Number) as number,
      name: 'Curry de poulet',
      servings: 4,
      category: 'MAIN',
      prepMinutes: 35,
      cooking: '20 min à feu doux.',
      notes: 'Le poulet se remplace par de la dinde.',
      ingredients: [
        {
          id: expect.any(Number) as number,
          foodItemId: chicken.id,
          quantity: 800,
        },
        { id: expect.any(Number) as number, foodItemId: egg.id, quantity: 2 },
      ],
      steps: ['Couper le poulet.', 'Faire revenir avec le curry.'],
      totals: { kcal: 1020, protein: 196, carbs: 1, fat: 26 },
      archived: false,
    });
  });

  it('trims the texts and stores the optional fields left empty as null', async () => {
    const recipe = await createRecipe(
      db,
      curry({
        name: '  Omelette ',
        category: null,
        prepMinutes: null,
        cooking: ' ',
        notes: '   ',
        steps: ['  Battre les œufs. '],
      }),
    );

    expect(recipe).toMatchObject({
      name: 'Omelette',
      category: null,
      prepMinutes: null,
      cooking: null,
      notes: null,
      steps: ['Battre les œufs.'],
    });
  });

  it('saves a recipe without steps, and the same food twice', async () => {
    const recipe = await createRecipe(
      db,
      curry({
        ingredients: [
          { foodItemId: egg.id, quantity: 2 },
          { foodItemId: egg.id, quantity: 1 },
        ],
        steps: [],
      }),
    );

    expect(recipe.steps).toEqual([]);
    expect(recipe.totals.kcal).toBe(210);
  });

  it.each<[string, Partial<RecipeInput>]>([
    ['a blank name', { name: '   ' }],
    ['a name over 120 characters', { name: 'a'.repeat(121) }],
    ['no serving', { servings: 0 }],
    ['half a serving', { servings: 1.5 }],
    ['over 50 servings', { servings: 51 }],
    [
      'an unknown category',
      { category: 'BRUNCH' as unknown as RecipeInput['category'] },
    ],
    ['a preparation of 0 minutes', { prepMinutes: 0 }],
    ['a preparation over a day', { prepMinutes: 1441 }],
    ['a preparation in part of a minute', { prepMinutes: 12.5 }],
    ['a cooking over 500 characters', { cooking: 'a'.repeat(501) }],
    ['notes over 2000 characters', { notes: 'a'.repeat(2001) }],
    ['no ingredient', { ingredients: [] }],
    [
      'over 50 ingredients',
      {
        ingredients: Array.from({ length: 51 }, () => ({
          foodItemId: 1,
          quantity: 1,
        })),
      },
    ],
    ['a zero quantity', { ingredients: [{ foodItemId: 1, quantity: 0 }] }],
    [
      'a quantity over 10 kg',
      { ingredients: [{ foodItemId: 1, quantity: 10001 }] },
    ],
    [
      'a quantity with 3 decimals',
      { ingredients: [{ foodItemId: 1, quantity: 1.234 }] },
    ],
    ['an unknown food', { ingredients: [{ foodItemId: 999, quantity: 10 }] }],
    ['a blank step', { steps: ['Couper.', '  '] }],
    ['a step over 500 characters', { steps: ['a'.repeat(501)] }],
    ['over 30 steps', { steps: Array.from({ length: 31 }, () => 'Mélanger.') }],
    [
      'steps that are not a list',
      { steps: 'Couper.' as unknown as RecipeInput['steps'] },
    ],
  ])('refuses %s and saves nothing', async (_, override) => {
    await expect(createRecipe(db, curry(override))).rejects.toThrow(DataError);
    expect(await listRecipes(db)).toEqual([]);
  });

  it('refuses an archived food', async () => {
    await archiveFoodItem(db, egg.id);

    await expect(createRecipe(db, curry())).rejects.toThrow(
      "Un des aliments n'existe plus.",
    );
  });
});

describe('listRecipes', () => {
  it('sorts by name, case and accents ignored, archived ones included', async () => {
    await createRecipe(db, curry({ name: 'Omelette' }));
    const archived = await createRecipe(db, curry({ name: 'éclair' }));
    await createRecipe(db, curry({ name: 'curry' }));
    await archiveRecipe(db, archived.id);

    const recipes = await listRecipes(db);

    expect(recipes.map(({ name, archived }) => [name, archived])).toEqual([
      ['curry', false],
      ['éclair', true],
      ['Omelette', false],
    ]);
  });

  it('computes the totals from the current values of the foods', async () => {
    await createRecipe(db, curry());
    await updateFoodItem(db, egg.id, { ...egg, kcal: 80 });

    const [recipe] = await listRecipes(db);

    expect(recipe.totals.kcal).toBe(1040);
  });
});

describe('updateRecipe', () => {
  it('replaces the fields, the ingredients and the steps', async () => {
    const { id } = await createRecipe(db, curry());

    const recipe = await updateRecipe(
      db,
      id,
      curry({
        name: 'Omelette',
        servings: 1,
        ingredients: [{ foodItemId: egg.id, quantity: 3 }],
        steps: ['Battre les œufs.'],
      }),
    );

    expect(recipe).toMatchObject({
      id,
      name: 'Omelette',
      servings: 1,
      ingredients: [{ foodItemId: egg.id, quantity: 3 }],
      steps: ['Battre les œufs.'],
      totals: { kcal: 210 },
    });
    expect(await listRecipes(db)).toHaveLength(1);
  });

  it('keeps an archived food the recipe already holds', async () => {
    const { id } = await createRecipe(db, curry());
    await archiveFoodItem(db, egg.id);

    const recipe = await updateRecipe(db, id, curry({ servings: 2 }));

    expect(recipe.ingredients).toHaveLength(2);
  });

  it('refuses an archived food another recipe holds', async () => {
    await createRecipe(db, curry());
    const { id } = await createRecipe(
      db,
      curry({ ingredients: [{ foodItemId: chicken.id, quantity: 200 }] }),
    );
    await archiveFoodItem(db, egg.id);

    await expect(updateRecipe(db, id, curry())).rejects.toThrow(
      "Un des aliments n'existe plus.",
    );
  });

  it('refuses a rule broken and changes nothing', async () => {
    const recipe = await createRecipe(db, curry());

    await expect(
      updateRecipe(db, recipe.id, curry({ ingredients: [] })),
    ).rejects.toThrow(DataError);
    expect(await listRecipes(db)).toEqual([recipe]);
  });

  it('refuses an archived or missing recipe', async () => {
    const { id } = await createRecipe(db, curry());
    await archiveRecipe(db, id);

    for (const target of [id, 999]) {
      await expect(updateRecipe(db, target, curry())).rejects.toThrow(
        "Cette recette n'existe plus.",
      );
    }
  });
});

describe('archiveRecipe', () => {
  it('keeps the recipe, marked archived', async () => {
    const { id } = await createRecipe(db, curry());

    const recipe = await archiveRecipe(db, id);

    expect(recipe).toMatchObject({ id, archived: true });
    expect(recipe.ingredients).toHaveLength(2);
  });

  it('refuses a recipe already archived or missing', async () => {
    const { id } = await createRecipe(db, curry());
    await archiveRecipe(db, id);

    for (const target of [id, 999]) {
      await expect(archiveRecipe(db, target)).rejects.toThrow(
        "Cette recette n'existe plus.",
      );
    }
  });
});
