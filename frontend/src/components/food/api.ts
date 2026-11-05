import { JSON_HEADERS, request } from '../../utils/request';
import type { FoodItem, FoodItemInput, OffProduct } from './types';

const BASE_URL: string = import.meta.env.VITE_API_URL;

const FOOD_ITEMS_URL = `${BASE_URL}/food-items`;

/**
 * The whole food library, sorted by name, archived foods included (the screens
 * hide them).
 */
export function listFoodItems(signal?: AbortSignal) {
  return request<FoodItem[]>(FOOD_ITEMS_URL, { signal });
}

/** Adds a food to the library. */
export function createFoodItem(input: FoodItemInput) {
  return request<FoodItem>(FOOD_ITEMS_URL, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

/** Saves the edited food. */
export function updateFoodItem(id: number, input: FoodItemInput) {
  return request<FoodItem>(`${FOOD_ITEMS_URL}/${id}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

/**
 * Archives the food instead of deleting it, so the meals that use it keep their
 * data.
 */
export function deleteFoodItem(id: number) {
  return request<FoodItem>(`${FOOD_ITEMS_URL}/${id}`, {
    method: 'DELETE',
  });
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
