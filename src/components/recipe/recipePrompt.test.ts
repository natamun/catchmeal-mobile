import { describe, expect, it } from 'vitest';

import type { FoodItem } from '../food/types';
import type { Profile } from '../profile/api';
import { buildRecipePrompt } from './recipePrompt';
import type { Recipe } from './types';

const CHICKEN: FoodItem = {
  id: 1,
  name: 'Blanc de poulet',
  brand: 'Migros',
  barcode: null,
  baseQuantity: 100,
  baseUnit: 'GRAM',
  kcal: 110,
  protein: 23,
  carbs: 0,
  fat: 2,
  portionQuantity: null,
  portionName: null,
  archived: false,
};

const EGG: FoodItem = {
  ...CHICKEN,
  id: 2,
  name: 'Œuf',
  brand: null,
  baseQuantity: 1,
  baseUnit: 'PIECE',
  kcal: 70,
};

const CURRY: Recipe = {
  id: 1,
  name: 'Curry de poulet',
  servings: 4,
  category: 'MAIN',
  prepMinutes: 35,
  cooking: '20 min à feu doux.',
  notes: 'La dinde remplace le poulet.',
  ingredients: [
    { id: 1, foodItemId: 1, quantity: 800, section: null },
    { id: 2, foodItemId: 2, quantity: 2, section: null },
  ],
  steps: ['Couper le poulet.', 'Faire revenir avec le curry.'],
  totals: { kcal: 1020, protein: 196, carbs: 1, fat: 26 },
  archived: false,
};

const PROFILE: Profile = {
  height: 178,
  targetWeight: null,
  targetBodyFat: null,
  dailyCalorieGoal: 2100,
  dailyProteinGoal: 150,
  dailyCarbsGoal: 230,
  dailyFatGoal: 70,
  gender: 'MALE',
  birthDate: null,
  activityLevel: null,
  goalType: 'LOSE_FAT',
  goalPace: null,
  theme: null,
  leanLossAlert: true,
};

describe('buildRecipePrompt', () => {
  it('gives the goal, the whole recipe per serving, then the place for the question', () => {
    expect(buildRecipePrompt(CURRY, [CHICKEN, EGG], PROFILE)).toBe(
      [
        'Voici une de mes recettes, tirée de mon livre de recettes dans mon app. Réponds à ma question à la fin.',
        '',
        '## Mon objectif, pour info',
        '- Objectif : Perdre du gras',
        '- Cibles par jour : 2100 kcal, 150 g de protéines, 230 g de glucides, 70 g de lipides',
        "- La recette n'a pas à coller à cet objectif : ne la change pas pour lui, sauf si je te le demande.",
        '',
        '## Recette : Curry de poulet',
        '- Plat, préparation 35 min',
        '- Pour 4 portions',
        '- Par portion : 255 kcal, 49 g de protéines, 0,3 g de glucides, 6,5 g de lipides',
        '',
        '### Ingrédients (pour 4 portions)',
        '- Blanc de poulet (Migros) : 800 g, 880 kcal',
        '- Œuf : 2 pièces, 140 kcal',
        '',
        '### Cuisson',
        '20 min à feu doux.',
        '',
        '### Préparation',
        '1. Couper le poulet.',
        '2. Faire revenir avec le curry.',
        '',
        '### Autres',
        'La dinde remplace le poulet.',
        '',
        'Ma question : ',
      ].join('\n'),
    );
  });

  it('says what is missing, and leaves out the empty parts', () => {
    const text = buildRecipePrompt(
      {
        ...CURRY,
        category: null,
        prepMinutes: null,
        cooking: null,
        notes: null,
        steps: [],
      },
      [CHICKEN, EGG],
      {
        ...PROFILE,
        goalType: null,
        dailyCalorieGoal: null,
        dailyProteinGoal: null,
        dailyCarbsGoal: null,
        dailyFatGoal: null,
      },
    );

    expect(text).toContain(
      '- Objectif : non renseigné\n- Cibles par jour : non renseignées',
    );
    expect(text).toContain('## Recette : Curry de poulet\n- Pour 4 portions');
    expect(text).not.toMatch(/### (Cuisson|Préparation|Autres)/);
  });

  it('lists the ingredients under the name of their section', () => {
    const text = buildRecipePrompt(
      {
        ...CURRY,
        ingredients: [
          { id: 1, foodItemId: 1, quantity: 800, section: 'Poulet' },
          { id: 2, foodItemId: 2, quantity: 2, section: 'Sauce' },
        ],
      },
      [CHICKEN, EGG],
      PROFILE,
    );

    expect(text).toContain(
      '### Ingrédients (pour 4 portions)\nPoulet :\n- Blanc de poulet (Migros) : 800 g, 880 kcal\nSauce :\n- Œuf : 2 pièces, 140 kcal',
    );
  });
});
