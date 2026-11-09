import { describe, expect, it } from 'vitest';

import type { FoodItem } from '../food/types';
import type { Recipe } from '../recipe/types';
import {
  adjustDraft,
  buildDrafts,
  draftsToInput,
  draftTotals,
  mealToItems,
  newFoodDraft,
  newRecipeDraft,
  setDraftQuantity,
  showInPortions,
} from './draft';
import type { Meal } from './types';

const BISCUITS: FoodItem = {
  id: 1,
  name: 'Petit beurre',
  brand: null,
  barcode: null,
  baseQuantity: 100,
  baseUnit: 'GRAM',
  kcal: 450,
  protein: 7,
  carbs: 75,
  fat: 12,
  portionQuantity: 12,
  portionName: 'biscuit',
  archived: false,
};

const RICE: FoodItem = {
  ...BISCUITS,
  id: 2,
  name: 'Riz',
  portionQuantity: null,
  portionName: null,
};

describe('newFoodDraft', () => {
  it('starts a food with a portion at one portion, shown in portions', () => {
    expect(newFoodDraft(BISCUITS)).toMatchObject({
      quantity: 12,
      inPortions: true,
    });
    expect(newFoodDraft(RICE)).toMatchObject({
      quantity: 100,
      inPortions: false,
    });
  });
});

describe('adjustDraft', () => {
  it('steps by a portion in portions, by the base unit otherwise', () => {
    const biscuits = newFoodDraft(BISCUITS);

    expect(adjustDraft(biscuits, 3)).toMatchObject({ quantity: 48 });
    expect(adjustDraft(biscuits, -10)).toMatchObject({ quantity: 12 });
    expect(adjustDraft(showInPortions(biscuits, false), 10)).toMatchObject({
      quantity: 22,
    });
    expect(adjustDraft(newFoodDraft(RICE), -200)).toMatchObject({
      quantity: 1,
    });
  });
});

describe('showInPortions', () => {
  it('rounds to a whole number of portions, one at least', () => {
    const grams = {
      ...newFoodDraft(BISCUITS),
      quantity: 50,
      inPortions: false,
    };

    expect(showInPortions(grams, true)).toMatchObject({
      quantity: 48,
      inPortions: true,
    });
    expect(showInPortions({ ...grams, quantity: 3 }, true)).toMatchObject({
      quantity: 12,
    });
    expect(showInPortions(newFoodDraft(RICE), true)).toMatchObject({
      inPortions: false,
    });
  });

  it('keeps the quantity when going back to the base unit', () => {
    const four = adjustDraft(newFoodDraft(BISCUITS), 3);

    expect(showInPortions(four, false)).toMatchObject({
      quantity: 48,
      inPortions: false,
    });
  });
});

describe('a meal logged by the portion', () => {
  const meal = (quantity: number): Meal => ({
    id: 1,
    name: null,
    typeMeal: 'SNACK',
    loggedAt: '2026-11-07',
    items: [
      {
        id: 1,
        foodItemId: BISCUITS.id,
        recipeId: null,
        quantity,
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    ],
  });

  it('saves the grams and counts them from the food per 100 g', () => {
    const four = adjustDraft(newFoodDraft(BISCUITS), 3);

    expect(draftsToInput([four])).toEqual([
      { foodItemId: BISCUITS.id, quantity: 48 },
    ]);
    expect(draftTotals([four]).kcal).toBeCloseTo(216);
  });

  it('opens again in portions when they fall right, in grams otherwise', () => {
    expect(mealToItems(meal(48), [BISCUITS])[0]).toMatchObject({
      inPortions: true,
    });
    expect(mealToItems(meal(50), [BISCUITS])[0]).toMatchObject({
      inPortions: false,
    });
  });
});

describe('a recipe line', () => {
  const CURRY: Recipe = {
    id: 7,
    name: 'Curry de poulet',
    servings: 4,
    category: 'MAIN',
    prepMinutes: null,
    cooking: null,
    notes: null,
    ingredients: [],
    steps: [],
    totals: { kcal: 2000, protein: 200, carbs: 160, fat: 60 },
    archived: false,
  };

  const logged: Meal = {
    id: 1,
    name: null,
    typeMeal: 'DINNER',
    loggedAt: '2026-11-09',
    items: [
      {
        id: 1,
        foodItemId: null,
        recipeId: CURRY.id,
        quantity: 1.5,
        kcal: 750,
        protein: 75,
        carbs: 60,
        fat: 22.5,
      },
    ],
  };

  it('starts at one serving and counts its share of the recipe', () => {
    const draft = newRecipeDraft(CURRY);

    expect(draft).toMatchObject({ kind: 'recipe', quantity: 1 });
    expect(draftTotals([draft])).toEqual({
      kcal: 500,
      protein: 50,
      carbs: 40,
      fat: 15,
    });
    expect(draftsToInput([draft])).toEqual([{ recipeId: 7, quantity: 1 }]);
  });

  it('moves by half a serving, or by one, never under half', () => {
    const one = newRecipeDraft(CURRY);

    expect(adjustDraft(one, 1).quantity).toBe(1.5);
    expect(adjustDraft(one, 10).quantity).toBe(2);
    expect(adjustDraft(one, -1).quantity).toBe(0.5);
    expect(adjustDraft(one, -10).quantity).toBe(0.5);
  });

  it('opens again from the journal, and is skipped once the recipe is gone', () => {
    expect(mealToItems(logged, [], [CURRY])).toEqual([
      {
        id: expect.any(String) as string,
        kind: 'recipe',
        recipe: CURRY,
        quantity: 1.5,
      },
    ]);
    expect(mealToItems(logged, [], [])).toEqual([]);
  });

  it('adds up the servings of a recipe picked twice', () => {
    const drafts = buildDrafts(
      { recipes: [CURRY], meals: [logged] },
      { foodItems: [], recipes: [CURRY] },
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0].quantity).toBe(2.5);
  });
});

describe('setDraftQuantity', () => {
  const grams = { ...newFoodDraft(RICE), quantity: 100 };
  const biscuits = newFoodDraft(BISCUITS);

  it('takes the grams typed, rounded to 2 decimals, one at least', () => {
    expect(setDraftQuantity(grams, 812.345).quantity).toBe(812.35);
    expect(setDraftQuantity(grams, 0.4).quantity).toBe(1);
  });

  it('takes whole portions, one at least, saved in grams', () => {
    expect(setDraftQuantity(biscuits, 4).quantity).toBe(48);
    expect(setDraftQuantity(biscuits, 2.6).quantity).toBe(36);
    expect(setDraftQuantity(biscuits, 0.2).quantity).toBe(12);
  });

  it('takes the servings of a recipe, half a serving at least', () => {
    const line = newRecipeDraft({
      id: 1,
      name: 'Curry',
      servings: 4,
      category: null,
      prepMinutes: null,
      cooking: null,
      notes: null,
      ingredients: [],
      steps: [],
      totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      archived: false,
    });

    expect(setDraftQuantity(line, 2.25).quantity).toBe(2.25);
    expect(setDraftQuantity(line, 0.1).quantity).toBe(0.5);
  });

  it('keeps the quantity when the text is not a number above 0', () => {
    for (const typed of [0, -3, Number.NaN]) {
      expect(setDraftQuantity(grams, typed)).toBe(grams);
    }
  });
});
