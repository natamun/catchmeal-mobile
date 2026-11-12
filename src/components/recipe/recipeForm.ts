import { MAX_DECIMALS, roundDecimals } from '../../utils/decimals';
import { copyName } from '../../utils/format';
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
  section: 60,
} as const;

/** A step being written; `id` is only a local key for React lists. */
export interface StepDraft {
  id: string;
  text: string;
}

/**
 * A section title among the ingredients, such as "Sauce": the foods below it,
 * up to the next title, belong to it.
 */
export interface SectionDraft {
  id: string;
  kind: 'section';
  name: string;
}

/** A line of the ingredients being written: a food, or a section title. */
export type IngredientLine = MealItemDraft | SectionDraft;

export const newSection = (name = ''): SectionDraft => ({
  id: crypto.randomUUID(),
  kind: 'section',
  name,
});

export const isSection = (line: IngredientLine): line is SectionDraft =>
  line.kind === 'section';

/** The foods among the lines, section titles left out. */
export const foodLines = (lines: IngredientLine[]) =>
  lines.filter((line): line is MealItemDraft => !isSection(line));

/**
 * Each food with the section it falls under: the last title above it, or
 * null before the first title.
 */
export function withSections(lines: IngredientLine[]) {
  let section: string | null = null;
  const foods: { item: MealItemDraft; section: string | null }[] = [];
  for (const line of lines) {
    if (isSection(line)) section = line.name.trim() || null;
    else foods.push({ item: line, section });
  }
  return foods;
}

/**
 * The lines of foods with their section: a title before each run of foods
 * that share a section, none before those without.
 */
export function linesOf(
  foods: { item: MealItemDraft; section: string | null }[],
): IngredientLine[] {
  const lines: IngredientLine[] = [];
  let current: string | null = null;
  for (const { item, section } of foods) {
    if (section !== null && section !== current)
      lines.push(newSection(section));
    current = section;
    lines.push(item);
  }
  return lines;
}

/**
 * Whether the title `id` has no food under it: the next line is another
 * title, or there is none. Such a section would save nothing.
 */
export function isEmptySection(lines: IngredientLine[], id: string) {
  const index = lines.findIndex((line) => line.id === id);
  const next = lines[index + 1];
  return next === undefined || isSection(next);
}

/** A recipe being written: the fields as typed, the ingredients as drafts. */
export interface RecipeForm {
  name: string;
  category: RecipeCategory | null;
  servings: number;
  prepMinutes: string;
  cooking: string;
  notes: string;
  /** Foods of the library only, with the section titles between them. */
  ingredients: IngredientLine[];
  steps: StepDraft[];
}

export type RecipeFormErrors = Partial<
  Record<'name' | 'prepMinutes' | 'ingredients' | 'sections' | 'steps', string>
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
  const foods: { item: MealItemDraft; section: string | null }[] = [];
  for (const { foodItemId, quantity, section } of recipe.ingredients) {
    const foodItem = foodItems.find((food) => food.id === foodItemId);
    if (!foodItem) continue;
    foods.push({
      item: {
        id: crypto.randomUUID(),
        kind: 'food',
        foodItem,
        quantity,
        inPortions: wholePortions(foodItem, quantity) !== null,
      },
      section,
    });
  }
  return {
    name: recipe.name,
    category: recipe.category,
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes === null ? '' : String(recipe.prepMinutes),
    cooking: recipe.cooking ?? '',
    notes: recipe.notes ?? '',
    ingredients: linesOf(foods),
    steps: recipe.steps.length ? recipe.steps.map(newStep) : [newStep()],
  };
}

/** A new recipe filled from another, its name marked as a copy. */
export function copyToForm(recipe: Recipe, foodItems: FoodItem[]): RecipeForm {
  return {
    ...recipeToForm(recipe, foodItems),
    name: copyName(recipe.name, RECIPE_LIMITS.name),
  };
}

const writtenSteps = (steps: StepDraft[]) =>
  steps.map(({ text }) => text.trim()).filter((text) => text !== '');

/**
 * Name required, at least one ingredient, each section named and holding a
 * food, a preparation time in whole minutes when given, and the counts the
 * database keeps. Empty steps are left out, not refused.
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

  const foods = foodLines(form.ingredients);
  if (foods.length === 0) {
    errors.ingredients = 'Minimum un ingrédient';
  } else if (foods.length > RECIPE_LIMITS.ingredients) {
    errors.ingredients = `${RECIPE_LIMITS.ingredients} ingrédients maximum`;
  }

  const titles = form.ingredients.filter(isSection);
  if (titles.some((line) => isEmptySection(form.ingredients, line.id))) {
    errors.sections = 'Section vide : ajoutez-y un aliment ou retirez-la';
  } else if (titles.some((line) => line.name.trim() === '')) {
    errors.sections = 'Nom de section requis';
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
    ingredients: withSections(form.ingredients).flatMap(({ item, section }) =>
      item.kind === 'food'
        ? [
            {
              foodItemId: item.foodItem.id,
              quantity: roundDecimals(item.quantity, MAX_DECIMALS),
              section,
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
    totals: draftTotals(foodLines(form.ingredients)),
    servings: form.servings,
  });
