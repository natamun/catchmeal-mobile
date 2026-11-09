import { MAX_DECIMALS, roundDecimals } from '../../utils/decimals';
import { wholePortions } from '../food/portion';
import type { FoodItem } from '../food/types';
import type { Recipe } from '../recipe/types';
import type { Meal, MealItemInput } from './types';

/**
 * An item of a meal being edited: a food of the library with a quantity,
 * servings of a recipe, or a quick add (calories and macros typed by hand).
 * The quantity of a food is in its base unit; `inPortions` shows it as a
 * number of portions instead, for a food that has one. `id` is only a local
 * key for React lists.
 */
export type MealItemDraft =
  | {
      id: string;
      kind: 'food';
      foodItem: FoodItem;
      quantity: number;
      inPortions: boolean;
    }
  | {
      id: string;
      kind: 'recipe';
      recipe: Recipe;
      /** In servings. */
      quantity: number;
    }
  | {
      id: string;
      kind: 'quick';
      quantity: number;
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    };

/**
 * A food just added to a meal: one portion when it has one, its base quantity
 * otherwise.
 */
export function newFoodDraft(foodItem: FoodItem): MealItemDraft {
  return {
    id: crypto.randomUUID(),
    kind: 'food',
    foodItem,
    quantity: foodItem.portionQuantity ?? foodItem.baseQuantity,
    inPortions: foodItem.portionQuantity !== null,
  };
}

/** A recipe just added to a meal: one serving. */
export function newRecipeDraft(recipe: Recipe): MealItemDraft {
  return { id: crypto.randomUUID(), kind: 'recipe', recipe, quantity: 1 };
}

/** The smallest change of a recipe line: half a serving. */
const HALF_SERVING = 0.5;

/**
 * Changes the quantity of a food by `delta` of the unit it is shown in, a
 * portion or the base unit, never under one of them. A recipe moves by half
 * a serving, or by one for the large steps (±10), never under half a serving.
 */
export function adjustDraft(item: MealItemDraft, delta: number): MealItemDraft {
  if (item.kind === 'recipe') {
    const step = Math.sign(delta) * (Math.abs(delta) >= 10 ? 1 : HALF_SERVING);
    return { ...item, quantity: Math.max(HALF_SERVING, item.quantity + step) };
  }
  if (item.kind !== 'food') return item;
  const portion = item.inPortions ? item.foodItem.portionQuantity : null;
  if (portion === null) {
    return { ...item, quantity: Math.max(1, item.quantity + delta) };
  }
  const count = Math.max(1, Math.round(item.quantity / portion) + delta);
  return { ...item, quantity: count * portion };
}

/**
 * Sets the quantity typed, in the unit the item is shown in: a whole number
 * of portions or the base unit, one of them at least, or servings of a
 * recipe, half a serving at least. Anything but a number above 0 leaves the
 * item as it was.
 */
export function setDraftQuantity(
  item: MealItemDraft,
  typed: number,
): MealItemDraft {
  if (!Number.isFinite(typed) || typed <= 0 || item.kind === 'quick') {
    return item;
  }
  const rounded = roundDecimals(typed, MAX_DECIMALS);
  if (item.kind === 'recipe') {
    return { ...item, quantity: Math.max(HALF_SERVING, rounded) };
  }
  const portion = item.inPortions ? item.foodItem.portionQuantity : null;
  if (portion === null) return { ...item, quantity: Math.max(1, rounded) };
  return { ...item, quantity: Math.max(1, Math.round(typed)) * portion };
}

/**
 * Shows a food in portions or in its base unit. Into portions, the quantity
 * becomes the nearest whole number of them, one at least.
 */
export function showInPortions(
  item: MealItemDraft,
  inPortions: boolean,
): MealItemDraft {
  const portion = item.kind === 'food' ? item.foodItem.portionQuantity : null;
  if (item.kind !== 'food' || portion === null) return item;
  if (!inPortions) return { ...item, inPortions: false };
  const count = Math.max(1, Math.round(item.quantity / portion));
  return { ...item, inPortions: true, quantity: count * portion };
}

/**
 * Turns a saved meal back into editable drafts. An item whose food or recipe
 * can't be found any more is skipped.
 */
export function mealToItems(
  meal: Meal,
  foodItems: FoodItem[],
  recipes: Recipe[] = [],
): MealItemDraft[] {
  const drafts: MealItemDraft[] = [];

  for (const item of meal.items) {
    if (item.recipeId !== null) {
      const recipe = recipes.find((r) => r.id === item.recipeId);
      if (recipe) {
        drafts.push({
          id: crypto.randomUUID(),
          kind: 'recipe',
          recipe,
          quantity: item.quantity,
        });
      }
      continue;
    }

    if (item.foodItemId === null) {
      drafts.push({
        id: crypto.randomUUID(),
        kind: 'quick',
        quantity: item.quantity,
        kcal: item.kcal,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      });
      continue;
    }

    const foodItem = foodItems.find((f) => f.id === item.foodItemId);
    if (!foodItem) {
      continue;
    }

    drafts.push({
      id: crypto.randomUUID(),
      kind: 'food',
      foodItem,
      quantity: item.quantity,
      inPortions: wholePortions(foodItem, item.quantity) !== null,
    });
  }

  return drafts;
}

/**
 * Adds `extra` to `base`: a food or a recipe present in both becomes one line
 * with the quantities added up.
 */
function mergeDrafts(
  base: MealItemDraft[],
  extra: MealItemDraft[],
): MealItemDraft[] {
  const merged = [...base];

  for (const draft of extra) {
    if (draft.kind === 'recipe') {
      const index = merged.findIndex(
        (item) => item.kind === 'recipe' && item.recipe.id === draft.recipe.id,
      );
      if (index !== -1) {
        merged[index] = {
          ...merged[index],
          quantity: merged[index].quantity + draft.quantity,
        };
        continue;
      }
    }
    if (draft.kind === 'food') {
      const index = merged.findIndex(
        (item) =>
          item.kind === 'food' && item.foodItem.id === draft.foodItem.id,
      );
      const existing = merged[index];
      if (index !== -1 && existing.kind === 'food') {
        const quantity = existing.quantity + draft.quantity;
        merged[index] = {
          ...existing,
          quantity,
          inPortions:
            existing.inPortions &&
            wholePortions(existing.foodItem, quantity) !== null,
        };
        continue;
      }
    }
    merged.push(draft);
  }

  return merged;
}

/** What was picked to fill a journal section. */
interface Selection {
  foods?: FoodItem[];
  recipes?: Recipe[];
  meals?: Meal[];
}

/** The whole library, to find the foods and recipes of the meals again. */
interface Library {
  foodItems: FoodItem[];
  recipes: Recipe[];
}

/**
 * One list of drafts from foods, recipes and whole meals, with repeated foods
 * and recipes merged. Used to fill a journal section.
 */
export function buildDrafts(
  { foods = [], recipes = [], meals = [] }: Selection,
  library: Library,
): MealItemDraft[] {
  let drafts = [...foods.map(newFoodDraft), ...recipes.map(newRecipeDraft)];

  for (const meal of meals) {
    drafts = mergeDrafts(
      drafts,
      mealToItems(meal, library.foodItems, library.recipes),
    );
  }

  return drafts;
}

/**
 * Calories and macros of the drafts: a food is scaled by quantity / base
 * quantity, a recipe by servings / its servings, a quick add counts as typed.
 */
export function draftTotals(items: MealItemDraft[]) {
  return items.reduce(
    (acc, item) => {
      if (item.kind === 'recipe') {
        const { totals, servings } = item.recipe;
        const scale = item.quantity / servings;
        return {
          kcal: acc.kcal + totals.kcal * scale,
          protein: acc.protein + totals.protein * scale,
          carbs: acc.carbs + totals.carbs * scale,
          fat: acc.fat + totals.fat * scale,
        };
      }
      if (item.kind === 'food') {
        const scale = item.quantity / item.foodItem.baseQuantity;
        return {
          kcal: acc.kcal + item.foodItem.kcal * scale,
          protein: acc.protein + item.foodItem.protein * scale,
          carbs: acc.carbs + item.foodItem.carbs * scale,
          fat: acc.fat + item.foodItem.fat * scale,
        };
      }
      return {
        kcal: acc.kcal + item.kcal,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/**
 * Converts drafts to the lines to save, rounded to the decimals the app
 * accepts. A food or a recipe only gives its id and quantity: its macros are
 * computed when the meal is saved.
 */
export function draftsToInput(items: MealItemDraft[]): MealItemInput[] {
  return items.map((item) => {
    const quantity = roundDecimals(item.quantity, MAX_DECIMALS);
    if (item.kind === 'food') return { foodItemId: item.foodItem.id, quantity };
    if (item.kind === 'recipe') return { recipeId: item.recipe.id, quantity };
    return {
      quantity,
      kcal: roundDecimals(item.kcal, MAX_DECIMALS),
      protein: roundDecimals(item.protein, MAX_DECIMALS),
      carbs: roundDecimals(item.carbs, MAX_DECIMALS),
      fat: roundDecimals(item.fat, MAX_DECIMALS),
    };
  });
}
