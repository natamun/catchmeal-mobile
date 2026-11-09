import { changing } from '../../data/changes';
import { throwIfAborted } from '../../data/errors';
import * as recipes from '../../data/recipes';
import { getDatabase } from '../../db/appDatabase';
import type { RecipeInput } from './types';

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
