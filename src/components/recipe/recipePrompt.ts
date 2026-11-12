import { formatKg, formatMinutes } from '../../utils/format';
import type { FoodItem } from '../food/types';
import type { Profile } from '../profile/api';
import { GOAL_TYPE_OPTIONS } from '../profile/goalTypes';
import { amountText, perServing, servingsLabel } from './servings';
import { RECIPE_CATEGORY_LABELS, type Recipe } from './types';

/** Grams of a macro, to one decimal: "52,3 g". */
const grams = (value: number) => `${formatKg(Math.round(value * 10) / 10)} g`;

/** The goal and the daily targets set in the profile. */
function goalLines(profile: Profile) {
  const goal = GOAL_TYPE_OPTIONS.find(
    ({ value }) => value === profile.goalType,
  )?.label;
  const targets = [
    profile.dailyCalorieGoal !== null && `${profile.dailyCalorieGoal} kcal`,
    profile.dailyProteinGoal !== null &&
      `${profile.dailyProteinGoal} g de protéines`,
    profile.dailyCarbsGoal !== null &&
      `${profile.dailyCarbsGoal} g de glucides`,
    profile.dailyFatGoal !== null && `${profile.dailyFatGoal} g de lipides`,
  ].filter(Boolean);
  return [
    `- Objectif : ${goal ?? 'non renseigné'}`,
    `- Cibles par jour : ${targets.length > 0 ? targets.join(', ') : 'non renseignées'}`,
  ];
}

/**
 * Each ingredient with its quantity and its calories, under the name of its
 * section when it has one.
 */
function ingredientLines(recipe: Recipe, foodItems: FoodItem[]) {
  let current: string | null = null;
  return recipe.ingredients.flatMap(({ foodItemId, quantity, section }) => {
    const food = foodItems.find(({ id }) => id === foodItemId);
    if (!food) return [];
    const kcal = Math.round((food.kcal * quantity) / food.baseQuantity);
    const brand = food.brand ? ` (${food.brand})` : '';
    const title =
      section !== null && section !== current ? [`${section} :`] : [];
    current = section;
    return [
      ...title,
      `- ${food.name}${brand} : ${amountText(food, quantity)}, ${kcal} kcal`,
    ];
  });
}

/**
 * The text to paste into an AI chat to talk about a recipe: the goal and
 * the daily targets for context only (the recipe book is not a diet plan),
 * the whole recipe with its values per serving. It ends on
 * "Ma question :" for the question to be typed after it, like the stats.
 */
export function buildRecipePrompt(
  recipe: Recipe,
  foodItems: FoodItem[],
  profile: Profile,
) {
  const serving = perServing(recipe);
  const details = [
    recipe.category && RECIPE_CATEGORY_LABELS[recipe.category],
    recipe.prepMinutes && `préparation ${formatMinutes(recipe.prepMinutes)}`,
  ].filter(Boolean);
  const servings = servingsLabel(recipe.servings);

  const sections = [
    [
      'Voici une de mes recettes, tirée de mon livre de recettes dans mon app. Réponds à ma question à la fin.',
    ],
    [
      '## Mon objectif, pour info',
      ...goalLines(profile),
      "- La recette n'a pas à coller à cet objectif : ne la change pas pour lui, sauf si je te le demande.",
    ],
    [
      `## Recette : ${recipe.name}`,
      ...(details.length > 0 ? [`- ${details.join(', ')}`] : []),
      `- Pour ${servings}`,
      `- Par portion : ${Math.round(serving.kcal)} kcal, ${grams(serving.protein)} de protéines, ${grams(serving.carbs)} de glucides, ${grams(serving.fat)} de lipides`,
    ],
    [
      `### Ingrédients (pour ${servings})`,
      ...ingredientLines(recipe, foodItems),
    ],
    recipe.cooking ? ['### Cuisson', recipe.cooking] : [],
    recipe.steps.length > 0
      ? [
          '### Préparation',
          ...recipe.steps.map((step, index) => `${index + 1}. ${step}`),
        ]
      : [],
    recipe.notes ? ['### Autres', recipe.notes] : [],
    ['Ma question : '],
  ];

  return sections
    .filter((section) => section.length > 0)
    .map((section) => section.join('\n'))
    .join('\n\n');
}
