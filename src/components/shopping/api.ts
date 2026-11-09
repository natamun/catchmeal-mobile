import { changing } from '../../data/changes';
import { throwIfAborted } from '../../data/errors';
import * as shopping from '../../data/shopping';
import { getDatabase } from '../../db/appDatabase';
import type { ShoppingFoodInput } from './types';

/** Every line of the shopping list, in the order they were added. */
export async function listShopping(signal?: AbortSignal) {
  const list = await shopping.listShopping(await getDatabase());
  throwIfAborted(signal);
  return list;
}

/** Adds foods to buy; a food already there for the same recipe adds up. */
export async function addFoodsToShopping(lines: ShoppingFoodInput[]) {
  return changing(shopping.addFoodsToShopping(await getDatabase(), lines));
}

/** Adds a free text to buy. */
export async function addLabelToShopping(label: string) {
  return changing(shopping.addLabelToShopping(await getDatabase(), label));
}

/** Marks lines as in the basket, or back to buy. */
export async function setShoppingChecked(ids: number[], checked: boolean) {
  return changing(
    shopping.setShoppingChecked(await getDatabase(), ids, checked),
  );
}

/** Removes lines from the list. */
export async function removeShoppingItems(ids: number[]) {
  return changing(shopping.removeShoppingItems(await getDatabase(), ids));
}

/** Removes the lines already in the basket. */
export async function removeCheckedShopping() {
  return changing(shopping.removeCheckedShopping(await getDatabase()));
}

/** Empties the list. */
export async function clearShopping() {
  return changing(shopping.clearShopping(await getDatabase()));
}
