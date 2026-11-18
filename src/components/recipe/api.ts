import * as batches from '../../data/batches';
import { changing } from '../../data/changes';
import { throwIfAborted } from '../../data/errors';
import * as recipes from '../../data/recipes';
import { getDatabase } from '../../db/appDatabase';
import type { CookInput, RecipeInput } from './types';

/**
 * Every recipe sorted by name, archived ones included (the screens hide
 * them).
 */
export async function listRecipes(signal?: AbortSignal) {
  const list = await recipes.listRecipes(await getDatabase());
  throwIfAborted(signal);
  return list;
}

/** Adds a recipe to the library. */
export async function createRecipe(input: RecipeInput) {
  return changing(recipes.createRecipe(await getDatabase(), input));
}

/** Saves the edited recipe. */
export async function updateRecipe(id: number, input: RecipeInput) {
  return changing(recipes.updateRecipe(await getDatabase(), id, input));
}

/**
 * Archives the recipe instead of deleting it, so the meals that logged it
 * keep its name.
 */
export async function deleteRecipe(id: number) {
  return changing(recipes.archiveRecipe(await getDatabase(), id));
}

/** Every batch, for the journal lines that took from one. */
export async function listBatches(signal?: AbortSignal) {
  const list = await batches.listBatches(await getDatabase());
  throwIfAborted(signal);
  return list;
}

/** The leftovers, the newest cooked first. */
export async function listLeftovers(signal?: AbortSignal) {
  const list = await batches.listLeftovers(await getDatabase());
  throwIfAborted(signal);
  return list;
}

/** Cooks a recipe ahead: all its servings become a leftover. */
export async function cookRecipe(
  recipeId: number,
  cook: CookInput,
  cookedOn: string,
) {
  return changing(
    batches.cookRecipe(await getDatabase(), recipeId, cook, cookedOn),
  );
}

/** Removes a leftover from the list; the journal keeps what was eaten. */
export async function discardLeftover(id: number) {
  return changing(batches.discardBatch(await getDatabase(), id));
}
