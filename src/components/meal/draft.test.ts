import { describe, expect, it } from 'vitest';

import type { FoodItem } from '../food/types';
import {
  adjustDraft,
  draftsToInput,
  draftTotals,
  mealToItems,
  newFoodDraft,
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
