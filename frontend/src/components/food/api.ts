import { throwIfAborted } from '../../data/errors';
import * as foodItems from '../../data/foodItems';
import { getDatabase } from '../../db/appDatabase';
import { request } from '../../utils/request';
import type { FoodItemInput, OffProduct } from './types';

const BASE_URL: string = import.meta.env.VITE_API_URL;

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
  return foodItems.createFoodItem(await getDatabase(), input);
}

/** Saves the edited food. */
export async function updateFoodItem(id: number, input: FoodItemInput) {
  return foodItems.updateFoodItem(await getDatabase(), id, input);
}

/**
 * Archives the food instead of deleting it, so the meals that use it keep their
 * data.
 */
export async function deleteFoodItem(id: number) {
  return foodItems.archiveFoodItem(await getDatabase(), id);
}

/**
 * Asks Open Food Facts for the product. Resolves to null when the barcode is
 * unknown.
 */
export function lookupOffProduct(barcode: string) {
  return request<{ product: OffProduct | null }>(
    `${BASE_URL}/off-products/${encodeURIComponent(barcode)}`,
  ).then(({ product }) => product);
}
