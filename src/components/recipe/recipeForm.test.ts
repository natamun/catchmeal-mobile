import { describe, expect, it } from 'vitest';

import type { FoodItem } from '../food/types';
import { newFoodDraft } from '../meal/draft';
import {
  copyToForm,
  emptyRecipeForm,
  formPerServing,
  formToInput,
  newSection,
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
    [
      'a section without a name over a food',
      { ingredients: [newSection(' '), newFoodDraft(BISCUIT)] },
      'sections',
    ],
    [
      'section titles without any food',
      { ingredients: [newSection('Crème')] },
      'ingredients',
    ],
    [
      'a section with no food under it, at the end',
      { ingredients: [newFoodDraft(BISCUIT), newSection('Crème')] },
      'sections',
    ],
    [
      'a section with no food under it, before another',
      {
        ingredients: [
          newSection('Crème'),
          newSection('Café'),
          newFoodDraft(BISCUIT),
        ],
      },
      'sections',
    ],
  ])('refuses %s', (_, override, field) => {
    expect(validateRecipeForm(filled(override))).toHaveProperty(field);
  });

  it('accepts named sections that each hold a food', () => {
    expect(
      validateRecipeForm(
        filled({
          ingredients: [
            newFoodDraft(BISCUIT),
            newSection('Crème'),
            newFoodDraft(BISCUIT),
          ],
        }),
      ),
    ).toEqual({});
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
      ingredients: [{ foodItemId: 1, quantity: 12, section: null }],
      steps: ['Tremper.', 'Monter.'],
    });
  });

  it('gives each food the title above it, an empty section left out', () => {
    const input = formToInput(
      filled({
        ingredients: [
          newFoodDraft(BISCUIT),
          newSection(' Crème '),
          newFoodDraft(BISCUIT),
          newSection(''),
          newSection('Café'),
          newFoodDraft(BISCUIT),
          newSection('Rien'),
        ],
      }),
    );

    expect(input.ingredients.map(({ section }) => section)).toEqual([
      null,
      'Crème',
      'Café',
    ]);
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
        { id: 1, foodItemId: 1, quantity: 48, section: null },
        { id: 2, foodItemId: 1, quantity: 50, section: null },
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

  it('puts a title before each run of foods that share a section', () => {
    const recipe: Recipe = {
      id: 3,
      name: 'Tiramisu',
      servings: 6,
      category: null,
      prepMinutes: null,
      cooking: null,
      notes: null,
      ingredients: [
        { id: 1, foodItemId: 1, quantity: 12, section: null },
        { id: 2, foodItemId: 1, quantity: 24, section: 'Crème' },
        { id: 3, foodItemId: 1, quantity: 36, section: 'Crème' },
        { id: 4, foodItemId: 1, quantity: 48, section: 'Café' },
      ],
      steps: [],
      totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      archived: false,
    };

    const lines = recipeToForm(recipe, [BISCUIT]).ingredients;

    expect(
      lines.map((line) =>
        line.kind === 'section' ? line.name : line.quantity,
      ),
    ).toEqual([12, 'Crème', 24, 36, 'Café', 48]);
  });
});

describe('copyToForm', () => {
  it('fills a new recipe from another, named as a copy within 120 characters', () => {
    const recipe: Recipe = {
      id: 3,
      name: 'Tiramisu',
      servings: 6,
      category: 'DESSERT',
      prepMinutes: 30,
      cooking: null,
      notes: 'Au frais 4 h.',
      ingredients: [{ id: 1, foodItemId: 1, quantity: 48, section: null }],
      steps: ['Tremper.'],
      totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      archived: false,
    };

    expect(copyToForm(recipe, [BISCUIT])).toMatchObject({
      name: 'Tiramisu (copie)',
      servings: 6,
      notes: 'Au frais 4 h.',
      steps: [{ text: 'Tremper.' }],
    });
    expect(
      copyToForm({ ...recipe, name: 'a'.repeat(120) }, [BISCUIT]).name,
    ).toHaveLength(120);
  });
});

describe('formPerServing', () => {
  it('divides the ingredients by the servings', () => {
    const form = filled({ servings: 2 });

    expect(formPerServing(form).kcal).toBeCloseTo(27);
  });
});
