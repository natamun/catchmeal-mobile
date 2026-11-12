import { describe, expect, it } from 'vitest';

import type { FoodItem } from '../food/types';
import {
  amountParts,
  amountText,
  perServing,
  recipeMeta,
  scaledQuantity,
  servingsLabel,
} from './servings';

const food = (override: Partial<FoodItem>): FoodItem => ({
  id: 1,
  name: 'Riz',
  brand: null,
  barcode: null,
  baseQuantity: 100,
  baseUnit: 'GRAM',
  kcal: 350,
  protein: 7,
  carbs: 78,
  fat: 1,
  portionQuantity: null,
  portionName: null,
  archived: false,
  ...override,
});

describe('servingsLabel', () => {
  it('writes the servings the French way', () => {
    expect(servingsLabel(1)).toBe('1 portion');
    expect(servingsLabel(1.5)).toBe('1,5 portions');
    expect(servingsLabel(4)).toBe('4 portions');
  });
});

describe('perServing', () => {
  it('divides the totals by the servings', () => {
    expect(
      perServing({
        servings: 4,
        totals: { kcal: 2000, protein: 200, carbs: 220, fat: 40 },
      }),
    ).toEqual({ kcal: 500, protein: 50, carbs: 55, fat: 10 });
  });
});

describe('recipeMeta', () => {
  it('joins the category and the preparation time', () => {
    expect(recipeMeta({ category: 'MAIN', prepMinutes: 75 })).toBe(
      'Plat · 1 h 15',
    );
    expect(recipeMeta({ category: null, prepMinutes: 20 })).toBe('20 min');
    expect(recipeMeta({ category: null, prepMinutes: null })).toBe('');
  });
});

describe('scaledQuantity', () => {
  it('scales a quantity to the servings wanted', () => {
    expect(scaledQuantity(800, 4, 6)).toBe(1200);
    expect(scaledQuantity(2, 4, 5)).toBe(2.5);
  });
});

describe('amountText', () => {
  it('writes grams, milliliters and pieces', () => {
    expect(amountText(food({}), 12.5)).toBe('12,5 g');
    expect(amountText(food({ baseUnit: 'MILLILITER' }), 200)).toBe('200 ml');
    expect(amountText(food({ baseUnit: 'PIECE', baseQuantity: 1 }), 2)).toBe(
      '2 pièces',
    );
  });

  it('counts whole portions, with their weight', () => {
    const biscuit = food({ portionQuantity: 12, portionName: 'biscuit' });

    expect(amountText(biscuit, 48)).toBe('4 biscuits (48 g)');
    expect(amountText(biscuit, 50)).toBe('50 g');
  });
});

describe('amountParts', () => {
  it('splits whole portions from their weight', () => {
    const biscuit = food({ portionQuantity: 12, portionName: 'biscuit' });

    expect(amountParts(biscuit, 48)).toEqual({
      main: '4 biscuits',
      weight: '48 g',
    });
    expect(amountParts(biscuit, 50)).toEqual({ main: '50 g', weight: null });
    expect(
      amountParts(food({ baseUnit: 'PIECE', baseQuantity: 1 }), 2),
    ).toEqual({ main: '2 pièces', weight: null });
  });
});
