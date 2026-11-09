import { MAX_DECIMALS, roundDecimals } from '../../utils/decimals';
import { maxLengthMessage } from '../../utils/validation';
import { wholePortions } from '../food/portion';
import type { FoodItem } from '../food/types';
import { draftTotals, type MealItemDraft } from '../meal/draft';
import { perServing } from './servings';
import type { Recipe, RecipeCategory, RecipeInput } from './types';

/** The limits the database keeps for a recipe. */
export const RECIPE_LIMITS = {
  name: 120,
  prepMinutes: 1440,
  cooking: 500,
  notes: 2000,
  step: 500,
  steps: 30,
  ingredients: 50,
} as const;

/** A step being written; `id` is only a local key for React lists. */
export interface StepDraft {
  id: string;
  text: string;
}

/** A recipe being written: the fields as typed, the ingredients as drafts. */
export interface RecipeForm {
  name: string;
  category: RecipeCategory | null;
  servings: number;
  prepMinutes: string;
  cooking: string;
  notes: string;
  /** Foods of the library only. */
  ingredients: MealItemDraft[];
  steps: StepDraft[];
}

export type RecipeFormErrors = Partial<
  Record<'name' | 'prepMinutes' | 'ingredients' | 'steps', string>
>;

export const newStep = (text = ''): StepDraft => ({
  id: crypto.randomUUID(),
  text,
});

/** A new recipe: for 4 servings, with one empty step to write. */
export function emptyRecipeForm(): RecipeForm {
  return {
    name: '',
    category: null,
    servings: 4,
    prepMinutes: '',
    cooking: '',
    notes: '',
    ingredients: [],
    steps: [newStep()],
  };
}

/**
 * Fills the form with a saved recipe. An ingredient shows in portions when
 * it is a whole number of them.
 */
export function recipeToForm(
  recipe: Recipe,
  foodItems: FoodItem[],
): RecipeForm {
  const ingredients: MealItemDraft[] = [];
  for (const { foodItemId, quantity } of recipe.ingredients) {
    const foodItem = foodItems.find((food) => food.id === foodItemId);
    if (!foodItem) continue;
    ingredients.push({
      id: crypto.randomUUID(),
      kind: 'food',
      foodItem,
      quantity,
      inPortions: wholePortions(foodItem, quantity) !== null,
    });
  }
  return {
    name: recipe.name,
    category: recipe.category,
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes === null ? '' : String(recipe.prepMinutes),
    cooking: recipe.cooking ?? '',
    notes: recipe.notes ?? '',
    ingredients,
    steps: recipe.steps.length ? recipe.steps.map(newStep) : [newStep()],
  };
}

const COPY = ' (copie)';

/** A new recipe filled from another, its name marked as a copy. */
export function copyToForm(recipe: Recipe, foodItems: FoodItem[]): RecipeForm {
  return {
    ...recipeToForm(recipe, foodItems),
    name: `${recipe.name.slice(0, RECIPE_LIMITS.name - COPY.length)}${COPY}`,
  };
}

const writtenSteps = (steps: StepDraft[]) =>
  steps.map(({ text }) => text.trim()).filter((text) => text !== '');

/**
 * Name required, at least one ingredient, a preparation time in whole
 * minutes when given, and the counts the database keeps. Empty steps are
 * left out, not refused.
 */
export function validateRecipeForm(form: RecipeForm): RecipeFormErrors {
  const errors: RecipeFormErrors = {};

  const name = form.name.trim();
  if (name === '') {
    errors.name = 'Nom requis';
  } else if (name.length > RECIPE_LIMITS.name) {
    errors.name = maxLengthMessage(RECIPE_LIMITS.name);
  }

  const prep = form.prepMinutes.trim();
  if (
    prep !== '' &&
    (!/^\d+$/.test(prep) ||
      Number(prep) < 1 ||
      Number(prep) > RECIPE_LIMITS.prepMinutes)
  ) {
    errors.prepMinutes = `Entre 1 et ${RECIPE_LIMITS.prepMinutes} minutes`;
  }

  if (form.ingredients.length === 0) {
    errors.ingredients = 'Minimum un ingrédient';
  } else if (form.ingredients.length > RECIPE_LIMITS.ingredients) {
    errors.ingredients = `${RECIPE_LIMITS.ingredients} ingrédients maximum`;
  }

  if (writtenSteps(form.steps).length > RECIPE_LIMITS.steps) {
    errors.steps = `${RECIPE_LIMITS.steps} étapes maximum`;
  }

  return errors;
}

/** The recipe to save: texts trimmed, empty ones as null, empty steps left out. */
export function formToInput(form: RecipeForm): RecipeInput {
  const prep = form.prepMinutes.trim();
  return {
    name: form.name.trim(),
    servings: form.servings,
    category: form.category,
    prepMinutes: prep === '' ? null : Number(prep),
    cooking: form.cooking.trim() || null,
    notes: form.notes.trim() || null,
    ingredients: form.ingredients.flatMap((item) =>
      item.kind === 'food'
        ? [
            {
              foodItemId: item.foodItem.id,
              quantity: roundDecimals(item.quantity, MAX_DECIMALS),
            },
          ]
        : [],
    ),
    steps: writtenSteps(form.steps),
  };
}

/** Calories and macros of one serving of the recipe being written. */
export const formPerServing = (form: RecipeForm) =>
  perServing({
    totals: draftTotals(form.ingredients),
    servings: form.servings,
  });

/** The steps with the one at `index` moved by `offset`, kept in bounds. */
export function moveStep(steps: StepDraft[], index: number, offset: number) {
  const target = index + offset;
  if (target < 0 || target >= steps.length) return steps;
  const moved = [...steps];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}
