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
    { id: 1, foodItemId: 1, quantity: 800 },
    { id: 2, foodItemId: 2, quantity: 2 },
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
  it('gives the goal, the whole recipe per serving, then the questions', () => {
    expect(buildRecipePrompt(CURRY, [CHICKEN, EGG], PROFILE)).toBe(
      [
        "Voici une de mes recettes. Donne-moi ton avis et aide-moi à l'améliorer pour mon objectif.",
        '',
        '## Mon objectif',
        '- Objectif : Perdre du gras',
        '- Cibles par jour : 2100 kcal, 150 g de protéines, 230 g de glucides, 70 g de lipides',
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
        "## Ce que j'aimerais savoir",
        '1. Ton avis : équilibre, goût, et intérêt pour mon objectif.',
        "2. Comment l'améliorer pour mon objectif : plus de protéines, moins de calories, ou des macros mieux réparties.",
        '3. Ce qui peut gagner en goût ou en temps de préparation.',
        '4. Une version modifiée avec la quantité exacte de chaque ingrédient, toujours pour 4 portions.',
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
});
