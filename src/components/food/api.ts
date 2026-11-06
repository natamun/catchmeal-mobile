import { changing } from '../../data/changes';
import { throwIfAborted } from '../../data/errors';
import * as foodItems from '../../data/foodItems';
import { createOffLookup } from '../../data/openFoodFacts';
import { getDatabase } from '../../db/appDatabase';
import { nativeGet } from '../../native/nativeHttp';
import type { FoodItemInput } from './types';

/**
 * The whole food library, sorted by name, archived foods included (the screens
 * hide them).
 */
export async function listFoodItems(signal?: AbortSignal) {
  const items = await foodItems.listFoodItems(await getDatabase());
  throwIfAborted(signal);
  return items;
}

/** Adds a food to the library. */
export async function createFoodItem(input: FoodItemInput) {
  return changing(foodItems.createFoodItem(await getDatabase(), input));
}

/** Saves the edited food. */
export async function updateFoodItem(id: number, input: FoodItemInput) {
  return changing(foodItems.updateFoodItem(await getDatabase(), id, input));
}

/**
 * Archives the food instead of deleting it, so the meals that use it keep their
 * data.
 */
export async function deleteFoodItem(id: number) {
  return changing(foodItems.archiveFoodItem(await getDatabase(), id));
}

/**
 * Asks Open Food Facts for the product. Resolves to null when the barcode is
 * unknown; throws an OffLookupError.
 */
export const lookupOffProduct = createOffLookup(nativeGet);
