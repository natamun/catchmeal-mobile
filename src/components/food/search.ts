import { matchesSearch } from '../ui/search';
import type { FoodItem } from './types';

/** A food whose name or brand holds every word of the search. */
export function matchesFood(food: FoodItem, query: string) {
  return matchesSearch([food.name, food.brand], query);
}
