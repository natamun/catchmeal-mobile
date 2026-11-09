import { describe, expect, it } from 'vitest';

import type { FoodItem } from '../food/types';
import { newFoodDraft } from '../meal/draft';
import {
  emptyRecipeForm,
  formPerServing,
  formToInput,
  moveStep,
  newStep,
  recipeToForm,
  validateRecipeForm,
  type RecipeForm,
} from './recipeForm';
import type { Recipe } from './types';

const BISCUIT: FoodItem = {
  id: 1,
  name: 'Biscuit',
  brand: null,
  barcode: null,
  baseQuantity: 100,
  baseUnit: 'GRAM',
  kcal: 450,
  protein: 6,
  carbs: 70,
  fat: 16,
  portionQuantity: 12,
  portionName: 'biscuit',
  archived: false,
};

const filled = (override: Partial<RecipeForm> = {}): RecipeForm => ({
  ...emptyRecipeForm(),
  name: 'Tiramisu',
  ingredients: [newFoodDraft(BISCUIT)],
  ...override,
});

describe('validateRecipeForm', () => {
  it('accepts a named recipe with an ingredient', () => {
    expect(validateRecipeForm(filled())).toEqual({});
  });

  it.each<[string, Partial<RecipeForm>, string]>([
    ['a blank name', { name: '  ' }, 'name'],
    ['a name over 120 characters', { name: 'a'.repeat(121) }, 'name'],
    ['no ingredient', { ingredients: [] }, 'ingredients'],
    ['a preparation of 0 minutes', { prepMinutes: '0' }, 'prepMinutes'],
    ['a preparation over a day', { prepMinutes: '1441' }, 'prepMinutes'],
    [
      'a preparation in part of a minute',
      { prepMinutes: '12,5' },
      'prepMinutes',
    ],
    [
      'over 30 steps',
      { steps: Array.from({ length: 31 }, () => newStep('Mélanger.')) },
      'steps',
    ],
  ])('refuses %s', (_, override, field) => {
    expect(validateRecipeForm(filled(override))).toHaveProperty(field);
  });
});

describe('formToInput', () => {
  it('trims the texts, leaves the empty ones out and keeps the order', () => {
    const input = formToInput(
      filled({
        name: ' Tiramisu ',
        category: 'DESSERT',
        prepMinutes: ' 30 ',
        cooking: '  ',
        notes: ' Au frais 4 h. ',
        steps: [newStep(' Tremper. '), newStep('  '), newStep('Monter.')],
      }),
    );

    expect(input).toEqual({
      name: 'Tiramisu',
      servings: 4,
      category: 'DESSERT',
      prepMinutes: 30,
      cooking: null,
      notes: 'Au frais 4 h.',
      ingredients: [{ foodItemId: 1, quantity: 12 }],
      steps: ['Tremper.', 'Monter.'],
    });
  });
});

describe('recipeToForm', () => {
  it('shows whole portions in portions and refills every field', () => {
    const recipe: Recipe = {
      id: 3,
      name: 'Tiramisu',
      servings: 6,
      category: 'DESSERT',
      prepMinutes: 30,
      cooking: null,
      notes: null,
      ingredients: [
        { id: 1, foodItemId: 1, quantity: 48 },
        { id: 2, foodItemId: 1, quantity: 50 },
      ],
      steps: [],
      totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      archived: false,
    };

    const form = recipeToForm(recipe, [BISCUIT]);

    expect(form).toMatchObject({
      name: 'Tiramisu',
      servings: 6,
      prepMinutes: '30',
      cooking: '',
      steps: [{ text: '' }],
    });
    expect(
      form.ingredients.map((item) =>
        item.kind === 'food' ? item.inPortions : null,
      ),
    ).toEqual([true, false]);
  });
});

describe('formPerServing', () => {
  it('divides the ingredients by the servings', () => {
    const form = filled({ servings: 2 });

    expect(formPerServing(form).kcal).toBeCloseTo(27);
  });
});

describe('moveStep', () => {
  const steps = [newStep('a'), newStep('b'), newStep('c')];
  const texts = (list: typeof steps) => list.map(({ text }) => text);

  it('swaps a step with its neighbour', () => {
    expect(texts(moveStep(steps, 0, 1))).toEqual(['b', 'a', 'c']);
    expect(texts(moveStep(steps, 2, -1))).toEqual(['a', 'c', 'b']);
  });

  it('keeps the first step first and the last one last', () => {
    expect(moveStep(steps, 0, -1)).toBe(steps);
    expect(moveStep(steps, 2, 1)).toBe(steps);
  });
});
