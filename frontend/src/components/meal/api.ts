import { throwIfAborted } from '../../data/errors';
import * as meals from '../../data/meals';
import { getDatabase } from '../../db/appDatabase';
import type { MealInput } from './types';

/**
 * Every meal, or with `logged` only the journal meals (true) or only the
 * library meals (false).
 */
export async function listMeals(logged?: boolean, signal?: AbortSignal) {
  const list = await meals.listMeals(await getDatabase(), { logged });
  throwIfAborted(signal);
  return list;
}

/** Formats a date as YYYY-MM-DD in local time, the way days are stored. */
export function toDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The journal meals of one day (YYYY-MM-DD). */
export async function listMealsOnDate(dateKey: string, signal?: AbortSignal) {
  const list = await meals.listMeals(await getDatabase(), { date: dateKey });
  throwIfAborted(signal);
  return list;
}

/**
 * Creates a journal meal (with loggedAt and typeMeal) or a library meal
 * (without them).
 */
export async function createMeal(input: MealInput) {
  return meals.createMeal(await getDatabase(), input);
}

/** Saves a meal; sending `items` replaces all the meal's items. */
export async function updateMeal(id: number, input: Partial<MealInput>) {
  return meals.updateMeal(await getDatabase(), id, input);
}

/** Meals are really deleted, they are not archived like foods. */
export async function deleteMeal(id: number) {
  return meals.deleteMeal(await getDatabase(), id);
}
