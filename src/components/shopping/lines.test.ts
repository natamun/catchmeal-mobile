import { describe, expect, it } from 'vitest';

import type { FoodItem } from '../food/types';
import { newFoodDraft, newRecipeDraft } from '../meal/draft';
import type { Recipe } from '../recipe/types';
import {
  draftsToShopping,
  recipeToShopping,
  shoppingAmount,
  shoppingText,
  toLines,
} from './lines';
import type { ShoppingItem } from './types';

const food = (id: number, name: string, override: Partial<FoodItem> = {}) =>
  ({
    id,
    name,
    brand: null,
    barcode: null,
    baseQuantity: 100,
    baseUnit: 'GRAM',
    kcal: 100,
    protein: 10,
    carbs: 10,
    fat: 1,
    portionQuantity: null,
    portionName: null,
    archived: false,
    ...override,
  }) satisfies FoodItem;

const CHICKEN = food(1, 'Blanc de poulet');
const EGG = food(2, 'Œuf', { baseUnit: 'PIECE', baseQuantity: 1 });
const MILK = food(3, 'Lait', { baseUnit: 'MILLILITER' });

const CURRY: Recipe = {
  id: 10,
  name: 'Curry',
  servings: 4,
  category: null,
  prepMinutes: null,
  cooking: null,
  notes: null,
  ingredients: [
    { id: 1, foodItemId: CHICKEN.id, quantity: 800 },
    { id: 2, foodItemId: EGG.id, quantity: 2 },
  ],
  steps: [],
  totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  archived: false,
};

const item = (override: Partial<ShoppingItem>): ShoppingItem => ({
  id: 1,
  foodItemId: null,
  label: null,
  quantity: null,
  checked: false,
  ...override,
});

describe('shoppingAmount', () => {
  it('writes grams and milliliters rounded up, kg and L from 1000', () => {
    expect(shoppingAmount(CHICKEN, 812.5)).toBe('813 g');
    expect(shoppingAmount(CHICKEN, 1250)).toBe('1,25 kg');
    expect(shoppingAmount(MILK, 200)).toBe('200 ml');
    expect(shoppingAmount(MILK, 1500)).toBe('1,5 L');
  });

  it('rounds pieces up, and the sums of decimals to their value first', () => {
    expect(shoppingAmount(EGG, 2.5)).toBe('3 pièces');
    expect(shoppingAmount(EGG, 1)).toBe('1 pièce');
    expect(shoppingAmount(CHICKEN, 0.1 + 0.2 + 299.7)).toBe('300 g');
  });
});

describe('toLines', () => {
  const items = [
    item({ id: 1, foodItemId: 1, quantity: 1200 }),
    item({ id: 2, label: 'Sacs poubelle' }),
    item({ id: 3, foodItemId: 3, quantity: 500, checked: true }),
  ];

  it('names each line and tells how much of a food to buy', () => {
    expect(toLines(items, [CHICKEN, MILK])).toEqual([
      { id: 1, name: 'Blanc de poulet', amount: '1,2 kg', checked: false },
      { id: 2, name: 'Sacs poubelle', amount: null, checked: false },
      { id: 3, name: 'Lait', amount: '500 ml', checked: true },
    ]);
  });

  it('writes the text to send with the lines still to buy only', () => {
    expect(shoppingText(toLines(items, [CHICKEN, MILK]))).toBe(
      'Courses\n- Blanc de poulet : 1,2 kg\n- Sacs poubelle',
    );
  });
});

describe('recipeToShopping', () => {
  it('scales the ingredients to the servings', () => {
    expect(recipeToShopping(CURRY, 6)).toEqual([
      { foodItemId: 1, quantity: 1200 },
      { foodItemId: 2, quantity: 3 },
    ]);
  });

  it('keeps a tiny quantity above nothing', () => {
    const pinch = {
      ...CURRY,
      servings: 50,
      ingredients: [{ id: 1, foodItemId: 1, quantity: 0.1 }],
    };

    expect(recipeToShopping(pinch, 1)[0].quantity).toBe(0.01);
  });
});

describe('draftsToShopping', () => {
  it('buys a food as picked and a recipe for its servings, not a quick add', () => {
    const lines = draftsToShopping([
      { ...newFoodDraft(MILK), quantity: 250 },
      { ...newRecipeDraft(CURRY), quantity: 2 },
      {
        id: 'q',
        kind: 'quick',
        quantity: 1,
        kcal: 300,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    ]);

    expect(lines).toEqual([
      { foodItemId: 3, quantity: 250 },
      { foodItemId: 1, quantity: 400 },
      { foodItemId: 2, quantity: 1 },
    ]);
  });
});
