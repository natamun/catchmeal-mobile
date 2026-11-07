import { roundDecimals } from '../../utils/decimals';
import type { FoodItem } from './types';

/** The name of a portion left unnamed. */
export const DEFAULT_PORTION_NAME = 'portion';

/**
 * The plural of a portion name the French way, for the usual words: "biscuit"
 * gives "biscuits", "gâteau" gives "gâteaux", "noix" stays.
 */
export function pluralOf(name: string) {
  if (/[sxz]$/i.test(name)) return name;
  if (/(au|eu)$/i.test(name)) return `${name}x`;
  return `${name}s`;
}

/** "1 biscuit", "4 biscuits", "2,5 portions". */
export function portionLabel(
  food: Pick<FoodItem, 'portionName'>,
  count: number,
) {
  const name = food.portionName ?? DEFAULT_PORTION_NAME;
  const shown = roundDecimals(count, 1);
  return `${shown.toLocaleString('fr-FR')} ${shown > 1 ? pluralOf(name) : name}`;
}

/**
 * How many whole portions a quantity makes, or null when the food has no
 * portion or the quantity is not a whole number of them.
 */
export function wholePortions(
  food: Pick<FoodItem, 'portionQuantity'>,
  quantity: number,
) {
  if (food.portionQuantity === null) return null;
  const count = Math.round(quantity / food.portionQuantity);
  return count >= 1 && Math.abs(count * food.portionQuantity - quantity) < 0.01
    ? count
    : null;
}
