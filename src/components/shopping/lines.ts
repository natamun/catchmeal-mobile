import { roundDecimals } from '../../utils/decimals';
import { portionLabel } from '../food/portion';
import type { FoodItem } from '../food/types';
import type { MealItemDraft } from '../meal/draft';
import { scaledQuantity } from '../recipe/servings';
import type { Recipe } from '../recipe/types';
import type { ShoppingFoodInput, ShoppingItem } from './types';

/** A line as shown: a food with how much to buy, or a free text. */
export interface ShoppingLine {
  id: number;
  name: string;
  /** How much to buy, such as "1,2 kg"; null for a free text. */
  amount: string | null;
  /** Already in the basket. */
  checked: boolean;
}

const PIECE = { portionName: 'pièce' };

/**
 * How much of a food to buy, rounded up: "813 g", "1,2 kg", "200 ml",
 * "1,5 L", "3 pièces" (half an egg is still an egg to buy).
 */
export function shoppingAmount(food: FoodItem, quantity: number) {
  // Rounded first, so the sums of decimals do not round 300 up to 301.
  const exact = roundDecimals(quantity, 2);
  if (food.baseUnit === 'PIECE') return portionLabel(PIECE, Math.ceil(exact));
  const [small, large] = food.baseUnit === 'GRAM' ? ['g', 'kg'] : ['ml', 'L'];
  if (exact >= 1000) {
    return `${roundDecimals(exact / 1000, 2).toLocaleString('fr-FR')} ${large}`;
  }
  return `${Math.ceil(exact)} ${small}`;
}

/** The lines as shown, in the order they were added. */
export function toLines(
  items: ShoppingItem[],
  foodItems: FoodItem[],
): ShoppingLine[] {
  return items.map((item) => {
    const food = foodItems.find(({ id }) => id === item.foodItemId);
    return {
      id: item.id,
      name: item.label ?? food?.name ?? 'Aliment inconnu',
      amount:
        food && item.quantity !== null
          ? shoppingAmount(food, item.quantity)
          : null,
      checked: item.checked,
    };
  });
}

/** The lines still to buy, as a text to send: "- Riz : 300 g". */
export function shoppingText(lines: ShoppingLine[]) {
  return [
    'Courses',
    ...lines
      .filter(({ checked }) => !checked)
      .map(({ name, amount }) => `- ${name}${amount ? ` : ${amount}` : ''}`),
  ].join('\n');
}

/** The foods of a recipe to buy for `servings` servings. */
export function recipeToShopping(
  recipe: Recipe,
  servings: number,
): ShoppingFoodInput[] {
  return recipe.ingredients.map(({ foodItemId, quantity }) => ({
    foodItemId,
    // The smallest quantity kept, so a pinch never rounds down to nothing.
    quantity: Math.max(
      0.01,
      roundDecimals(scaledQuantity(quantity, recipe.servings, servings), 2),
    ),
  }));
}

/**
 * The foods to buy from picked drafts: a food as it is, a recipe for its
 * servings. A quick add has no food to buy and is left out.
 */
export function draftsToShopping(items: MealItemDraft[]): ShoppingFoodInput[] {
  return items.flatMap((item) => {
    if (item.kind === 'food') {
      return [
        {
          foodItemId: item.foodItem.id,
          quantity: roundDecimals(item.quantity, 2),
        },
      ];
    }
    if (item.kind === 'recipe') {
      return recipeToShopping(item.recipe, item.quantity);
    }
    return [];
  });
}
