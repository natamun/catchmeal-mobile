import type { FoodItem } from './types';

/** A food whose name or brand holds the search, already lowercased. */
export function matchesFood(food: FoodItem, query: string) {
  return (
    food.name.toLowerCase().includes(query) ||
    (food.brand?.toLowerCase().includes(query) ?? false)
  );
}
