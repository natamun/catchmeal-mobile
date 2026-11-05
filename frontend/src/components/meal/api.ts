import { JSON_HEADERS, request } from '../../utils/request';
import type { Meal, MealInput } from './types';

const BASE_URL: string = import.meta.env.VITE_API_URL;

const MEALS_URL = `${BASE_URL}/meals`;

/**
 * Every meal, or with `logged` only the journal meals (true) or only the
 * library meals (false).
 */
export function listMeals(logged?: boolean, signal?: AbortSignal) {
  const url =
    logged === undefined ? MEALS_URL : `${MEALS_URL}?logged=${logged}`;
  return request<Meal[]>(url, { signal });
}

/**
 * Formats a date as YYYY-MM-DD in local time, the only date format the meals
 * API accepts.
 */
export function toApiDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The journal meals of one day (YYYY-MM-DD). */
export function listMealsOnDate(dateKey: string, signal?: AbortSignal) {
  return request<Meal[]>(`${MEALS_URL}?date=${dateKey}`, { signal });
}

/**
 * Creates a journal meal (with loggedAt and typeMeal) or a library meal
 * (without them).
 */
export function createMeal(input: MealInput) {
  return request<Meal>(MEALS_URL, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

/** Saves a meal; sending `items` replaces all the meal's items. */
export function updateMeal(id: number, input: MealInput) {
  return request<Meal>(`${MEALS_URL}/${id}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

/** Meals are really deleted, they are not archived like foods. */
export function deleteMeal(id: number) {
  return request<Meal>(`${MEALS_URL}/${id}`, { method: 'DELETE' });
}
