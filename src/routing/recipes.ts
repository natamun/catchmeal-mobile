import { generatePath } from 'react-router';

import { PATHS } from './paths';

/** URL of a recipe's page, or of the page that writes a new one. */
export const recipePath = (id: number | 'new') =>
  generatePath(PATHS.recipe, { recipeId: String(id) });

/** URL of the page that edits a recipe. */
export const recipeEditPath = (id: number) =>
  generatePath(PATHS.recipeEdit, { recipeId: String(id) });

/** URL of the page that edits a library meal, or writes a new one. */
export const mealPath = (id: number | 'new') =>
  generatePath(PATHS.meal, { mealId: String(id) });
