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

/** Each ingredient with its quantity and its calories. */
function ingredientLines(recipe: Recipe, foodItems: FoodItem[]) {
  return recipe.ingredients.flatMap(({ foodItemId, quantity }) => {
    const food = foodItems.find(({ id }) => id === foodItemId);
    if (!food) return [];
    const kcal = Math.round((food.kcal * quantity) / food.baseQuantity);
    const brand = food.brand ? ` (${food.brand})` : '';
    return [
      `- ${food.name}${brand} : ${amountText(food, quantity)}, ${kcal} kcal`,
    ];
  });
}

/**
 * The text to paste into an AI chat to talk about a recipe: the goal and
 * the daily targets, the whole recipe with its values per serving, then the
 * questions to ask, the last one for a version ready to be saved.
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
      "Voici une de mes recettes. Donne-moi ton avis et aide-moi à l'améliorer pour mon objectif.",
    ],
    ['## Mon objectif', ...goalLines(profile)],
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
    [
      "## Ce que j'aimerais savoir",
      '1. Ton avis : équilibre, goût, et intérêt pour mon objectif.',
      "2. Comment l'améliorer pour mon objectif : plus de protéines, moins de calories, ou des macros mieux réparties.",
      '3. Ce qui peut gagner en goût ou en temps de préparation.',
      `4. Une version modifiée avec la quantité exacte de chaque ingrédient, toujours pour ${servings}.`,
    ],
  ];

  return sections
    .filter((section) => section.length > 0)
    .map((section) => section.join('\n'))
    .join('\n\n');
}
