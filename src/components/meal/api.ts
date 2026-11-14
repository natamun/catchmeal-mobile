import { changing } from '../../data/changes';
import { throwIfAborted } from '../../data/errors';
import * as meals from '../../data/meals';
import { getDatabase } from '../../db/appDatabase';
import type { MealInput, MealItemInput } from './types';

/**
 * Every meal, or with `logged` only the journal meals (true) or only the
 * library meals (false).
 */
export async function listMeals(logged?: boolean, signal?: AbortSignal) {
  const list = await meals.listMeals(await getDatabase(), { logged });
  throwIfAborted(signal);
  return list;
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
  return changing(meals.createMeal(await getDatabase(), input));
}

/** Saves a meal; sending `items` replaces all the meal's items. */
export async function updateMeal(id: number, input: Partial<MealInput>) {
  return changing(meals.updateMeal(await getDatabase(), id, input));
}

/**
 * Changes one row of a journal section: its lines become `line`, or are
 * removed with null.
 */
export async function replaceLoggedLines(
  itemIds: number[],
  line: MealItemInput | null,
) {
  return changing(meals.replaceLoggedLines(await getDatabase(), itemIds, line));
}

/** Meals are really deleted, they are not archived like foods. */
export async function deleteMeal(id: number) {
  return changing(meals.deleteMeal(await getDatabase(), id));
}
