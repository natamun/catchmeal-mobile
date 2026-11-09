import {
  RECIPE_CATEGORIES,
  type Nutrition,
  type Recipe,
  type RecipeCategory,
  type RecipeInput,
} from '../components/recipe/types';
import type { Database, Executor, SqlValue } from '../db/database';
import { DataError } from './errors';
import {
  checkChoice,
  checkNumber,
  checkOptionalNumber,
  checkOptionalText,
  checkText,
} from './validation';

const GONE = "Cette recette n'existe plus.";
const MAX_INGREDIENTS = 50;
const MAX_STEPS = 30;

interface RecipeRow {
  id: number;
  name: string;
  servings: number;
  category: RecipeCategory | null;
  prep_minutes: number | null;
  cooking: string | null;
  notes: string | null;
  archived: number;
}

/** An ingredient with the values of its food, to compute the totals. */
interface IngredientRow {
  id: number;
  recipe_id: number;
  food_item_id: number;
  quantity: number;
  base_quantity: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface StepRow {
  recipe_id: number;
  instruction: string;
}

type Ingredient = RecipeInput['ingredients'][number];

/** The fields of a recipe checked and cleaned, its ingredients apart. */
function validateRecipe(input: RecipeInput) {
  if (!Array.isArray(input.steps)) {
    throw new DataError('Valeur invalide : préparation.');
  }
  if (input.steps.length > MAX_STEPS) {
    throw new DataError(`${MAX_STEPS} étapes maximum par recette.`);
  }
  return {
    name: checkText(input.name, 'nom', 120),
    servings: checkNumber(input.servings, 'nombre de portions', {
      min: 0,
      exclusive: true,
      max: 50,
      integer: true,
    }),
    category:
      input.category === null || input.category === undefined
        ? null
        : checkChoice(input.category, 'catégorie', RECIPE_CATEGORIES),
    prepMinutes: checkOptionalNumber(
      input.prepMinutes,
      'temps de préparation',
      { min: 0, exclusive: true, max: 1440, integer: true },
    ),
    cooking: checkOptionalText(input.cooking, 'cuisson', 500),
    notes: checkOptionalText(input.notes, 'notes', 2000),
    steps: input.steps.map((step) => checkText(step, 'étape', 500)),
  };
}

/**
 * Checks the ingredients: foods of the library, not archived, unless this
 * recipe already holds them (editing it must keep working).
 */
async function checkIngredients(
  tx: Executor,
  ingredients: unknown,
  recipeId: number | null,
): Promise<Ingredient[]> {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new DataError('La recette doit contenir au moins un ingrédient.');
  }
  if (ingredients.length > MAX_INGREDIENTS) {
    throw new DataError(`${MAX_INGREDIENTS} ingrédients maximum par recette.`);
  }
  const lines = (ingredients as Ingredient[]).map((item) => ({
    foodItemId: checkNumber(item.foodItemId, 'aliment', {
      min: 0,
      exclusive: true,
      integer: true,
    }),
    quantity: checkNumber(item.quantity, 'quantité', {
      min: 0,
      exclusive: true,
      max: 10000,
    }),
  }));

  const ids = [...new Set(lines.map(({ foodItemId }) => foodItemId))];
  const foods = await tx.query<{ id: number }>(
    `SELECT id FROM food_item
     WHERE id IN (${ids.map(() => '?').join(', ')})
       AND (archived = 0 OR EXISTS (SELECT 1 FROM recipe_ingredient WHERE food_item_id = food_item.id AND recipe_id = ?))`,
    [...ids, recipeId],
  );
  if (foods.length !== ids.length) {
    throw new DataError("Un des aliments n'existe plus.");
  }
  return lines;
}

async function insertParts(
  tx: Executor,
  recipeId: number,
  ingredients: Ingredient[],
  steps: string[],
) {
  for (const [position, item] of ingredients.entries()) {
    await tx.run(
      `INSERT INTO recipe_ingredient (recipe_id, food_item_id, position, quantity)
       VALUES (?, ?, ?, ?)`,
      [recipeId, item.foodItemId, position, item.quantity],
    );
  }
  for (const [position, instruction] of steps.entries()) {
    await tx.run(
      'INSERT INTO recipe_step (recipe_id, position, instruction) VALUES (?, ?, ?)',
      [recipeId, position, instruction],
    );
  }
}

/** The values of a food scaled to its quantity in the recipe, added up. */
function totalsOf(ingredients: IngredientRow[]): Nutrition {
  return ingredients.reduce(
    (acc, item) => {
      const scale = item.quantity / item.base_quantity;
      return {
        kcal: acc.kcal + item.kcal * scale,
        protein: acc.protein + item.protein * scale,
        carbs: acc.carbs + item.carbs * scale,
        fat: acc.fat + item.fat * scale,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/** Reads recipes with their ingredients and steps, sorted by name. */
async function readRecipes(db: Executor, where: string, params: SqlValue[]) {
  const recipes = await db.query<RecipeRow>(
    `SELECT id, name, servings, category, prep_minutes, cooking, notes, archived
     FROM recipe WHERE ${where}`,
    params,
  );
  const ingredients = await db.query<IngredientRow>(
    `SELECT i.id, i.recipe_id, i.food_item_id, i.quantity,
            f.base_quantity, f.kcal, f.protein, f.carbs, f.fat
     FROM recipe_ingredient i JOIN food_item f ON f.id = i.food_item_id
     WHERE i.recipe_id IN (SELECT id FROM recipe WHERE ${where})
     ORDER BY i.position, i.id`,
    params,
  );
  const steps = await db.query<StepRow>(
    `SELECT recipe_id, instruction FROM recipe_step
     WHERE recipe_id IN (SELECT id FROM recipe WHERE ${where})
     ORDER BY position, id`,
    params,
  );

  return recipes
    .map((recipe): Recipe => {
      const own = ingredients.filter((item) => item.recipe_id === recipe.id);
      return {
        id: recipe.id,
        name: recipe.name,
        servings: recipe.servings,
        category: recipe.category,
        prepMinutes: recipe.prep_minutes,
        cooking: recipe.cooking,
        notes: recipe.notes,
        ingredients: own.map((item) => ({
          id: item.id,
          foodItemId: item.food_item_id,
          quantity: item.quantity,
        })),
        steps: steps
          .filter((step) => step.recipe_id === recipe.id)
          .map((step) => step.instruction),
        totals: totalsOf(own),
        archived: recipe.archived === 1,
      };
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    );
}

async function readRecipe(db: Executor, id: number) {
  const [recipe] = await readRecipes(db, 'id = ?', [id]);
  return recipe;
}

/**
 * Every recipe sorted by name as a French reader expects, archived ones
 * included: the screens hide them.
 */
export async function listRecipes(db: Executor) {
  return readRecipes(db, '1 = 1', []);
}

/**
 * The recipes of `ids` a journal line can take: not archived, unless a meal
 * already logged them (editing that meal must keep working).
 */
export async function loggableRecipes(db: Executor, ids: number[]) {
  if (ids.length === 0) return new Map<number, Recipe>();
  const recipes = await readRecipes(
    db,
    `id IN (${ids.map(() => '?').join(', ')})
     AND (archived = 0 OR EXISTS (SELECT 1 FROM meal_item WHERE recipe_id = recipe.id))`,
    ids,
  );
  return new Map(recipes.map((recipe) => [recipe.id, recipe]));
}

/** Saves a recipe with its ingredients and steps at once. */
export async function createRecipe(db: Database, input: RecipeInput) {
  const recipe = validateRecipe(input);
  return db.transaction(async (tx) => {
    const ingredients = await checkIngredients(tx, input.ingredients, null);
    const { lastId } = await tx.run(
      `INSERT INTO recipe (name, servings, category, prep_minutes, cooking, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        recipe.name,
        recipe.servings,
        recipe.category,
        recipe.prepMinutes,
        recipe.cooking,
        recipe.notes,
      ],
    );
    await insertParts(tx, lastId, ingredients, recipe.steps);
    return readRecipe(tx, lastId);
  });
}

/**
 * Saves an edited recipe: its ingredients and steps are all replaced. An
 * archived recipe cannot change any more. The meals that logged it keep the
 * values of that day.
 */
export async function updateRecipe(
  db: Database,
  id: number,
  input: RecipeInput,
) {
  const recipe = validateRecipe(input);
  return db.transaction(async (tx) => {
    // Checked before the old ingredients go, so an archived food they hold
    // still counts as part of this recipe.
    const ingredients = await checkIngredients(tx, input.ingredients, id);
    const { changes } = await tx.run(
      `UPDATE recipe SET name = ?, servings = ?, category = ?, prep_minutes = ?, cooking = ?, notes = ?
       WHERE id = ? AND archived = 0`,
      [
        recipe.name,
        recipe.servings,
        recipe.category,
        recipe.prepMinutes,
        recipe.cooking,
        recipe.notes,
        id,
      ],
    );
    if (changes === 0) throw new DataError(GONE);
    await tx.run('DELETE FROM recipe_ingredient WHERE recipe_id = ?', [id]);
    await tx.run('DELETE FROM recipe_step WHERE recipe_id = ?', [id]);
    await insertParts(tx, id, ingredients, recipe.steps);
    return readRecipe(tx, id);
  });
}

/**
 * Archives a recipe instead of deleting it, so the meals that logged it keep
 * their link to it.
 */
export async function archiveRecipe(db: Executor, id: number) {
  const { changes } = await db.run(
    'UPDATE recipe SET archived = 1 WHERE id = ? AND archived = 0',
    [id],
  );
  if (changes === 0) throw new DataError(GONE);
  return readRecipe(db, id);
}
