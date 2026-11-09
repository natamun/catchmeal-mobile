/**
 * A line of the shopping list: a food with all its quantity in the food's
 * base unit, or a free text such as "Sacs poubelle". Checked means already
 * in the basket.
 */
export interface ShoppingItem {
  id: number;
  foodItemId: number | null;
  label: string | null;
  quantity: number | null;
  checked: boolean;
}

/** A food to buy. */
export interface ShoppingFoodInput {
  foodItemId: number;
  quantity: number;
}
