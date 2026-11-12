import { roundDecimals } from '../../utils/decimals';
import { formatMinutes } from '../../utils/format';
import { portionLabel, wholePortions } from '../food/portion';
import type { FoodItem } from '../food/types';
import { RECIPE_CATEGORY_LABELS, type Nutrition, type Recipe } from './types';

/** The most servings a recipe can be made for. */
export const MAX_SERVINGS = 50;

/** "1 portion", "1,5 portions", "4 portions". */
export const servingsLabel = (count: number) =>
  portionLabel({ portionName: null }, count);

/** Calories and macros of one serving. */
export function perServing({
  totals,
  servings,
}: Pick<Recipe, 'totals' | 'servings'>): Nutrition {
  return {
    kcal: totals.kcal / servings,
    protein: totals.protein / servings,
    carbs: totals.carbs / servings,
    fat: totals.fat / servings,
  };
}

/** Category and preparation time: "Plat · 35 min", empty without them. */
export function recipeMeta({
  category,
  prepMinutes,
}: Pick<Recipe, 'category' | 'prepMinutes'>) {
  return [
    category && RECIPE_CATEGORY_LABELS[category],
    prepMinutes && formatMinutes(prepMinutes),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The quantity of an ingredient for `wanted` servings instead of `servings`. */
export const scaledQuantity = (
  quantity: number,
  servings: number,
  wanted: number,
) => (quantity * wanted) / servings;

const PIECE = { portionName: 'pièce' };

/**
 * How much of a food in two parts: the main one, "800 g", "200 ml", "2 pièces"
 * or "4 biscuits" for whole portions, and the weight of those portions,
 * "48 g", null otherwise.
 */
export function amountParts(food: FoodItem, quantity: number) {
  if (food.baseUnit === 'PIECE') {
    return { main: portionLabel(PIECE, quantity), weight: null };
  }
  const unit = food.baseUnit === 'GRAM' ? 'g' : 'ml';
  const amount = `${roundDecimals(quantity, 1).toLocaleString('fr-FR')} ${unit}`;
  const count = wholePortions(food, quantity);
  return count === null
    ? { main: amount, weight: null }
    : { main: portionLabel(food, count), weight: amount };
}

/**
 * How much of a food, as a cook reads it: "800 g", "200 ml", "2 pièces", or
 * "4 biscuits (48 g)" for whole portions.
 */
export function amountText(food: FoodItem, quantity: number) {
  const { main, weight } = amountParts(food, quantity);
  return weight === null ? main : `${main} (${weight})`;
}
