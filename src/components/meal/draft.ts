import { MAX_DECIMALS, roundDecimals } from '../../utils/decimals';
import { wholePortions } from '../food/portion';
import type { FoodItem } from '../food/types';
import type { Meal, MealItemInput } from './types';

/**
 * An item of a meal being edited: a food of the library with a quantity, or a
 * quick add (calories and macros typed by hand). The quantity of a food is in
 * its base unit; `inPortions` shows it as a number of portions instead, for a
 * food that has one. `id` is only a local key for React lists.
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

/**
 * Changes the quantity of a food by `delta` of the unit it is shown in, a
 * portion or the base unit, never under one of them.
 */
export function adjustDraft(item: MealItemDraft, delta: number): MealItemDraft {
  if (item.kind !== 'food') return item;
  const portion = item.inPortions ? item.foodItem.portionQuantity : null;
  if (portion === null) {
    return { ...item, quantity: Math.max(1, item.quantity + delta) };
  }
  const count = Math.max(1, Math.round(item.quantity / portion) + delta);
  return { ...item, quantity: count * portion };
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
 * Turns a saved meal back into editable drafts. An item whose food can't be
 * found any more is skipped.
 */
export function mealToItems(
  meal: Meal,
  foodItems: FoodItem[],
): MealItemDraft[] {
  const drafts: MealItemDraft[] = [];

  for (const item of meal.items) {
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
 * Adds `extra` to `base`: a food present in both becomes one line with the
 * quantities added up.
 */
function mergeDrafts(
  base: MealItemDraft[],
  extra: MealItemDraft[],
): MealItemDraft[] {
  const merged = [...base];

  for (const draft of extra) {
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

/**
 * One list of drafts from foods and whole meals, with repeated foods merged.
 * Used to fill a journal section.
 */
export function buildDrafts(
  foods: FoodItem[],
  meals: Meal[],
  allFoodItems: FoodItem[],
): MealItemDraft[] {
  let drafts = foods.map(newFoodDraft);

  for (const meal of meals) {
    drafts = mergeDrafts(drafts, mealToItems(meal, allFoodItems));
  }

  return drafts;
}

/**
 * Calories and macros of the drafts: a food is scaled by quantity / base
 * quantity, a quick add counts as typed.
 */
export function draftTotals(items: MealItemDraft[]) {
  return items.reduce(
    (acc, item) => {
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
 * accepts. A food only gives its id and quantity: its macros are computed when
 * the meal is saved.
 */
export function draftsToInput(items: MealItemDraft[]): MealItemInput[] {
  return items.map((item) =>
    item.kind === 'food'
      ? {
          foodItemId: item.foodItem.id,
          quantity: roundDecimals(item.quantity, MAX_DECIMALS),
        }
      : {
          quantity: roundDecimals(item.quantity, MAX_DECIMALS),
          kcal: roundDecimals(item.kcal, MAX_DECIMALS),
          protein: roundDecimals(item.protein, MAX_DECIMALS),
          carbs: roundDecimals(item.carbs, MAX_DECIMALS),
          fat: roundDecimals(item.fat, MAX_DECIMALS),
        },
  );
}
