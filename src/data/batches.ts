import type { Batch, CookInput } from '../components/recipe/types';
import type { Database, Executor, SqlValue } from '../db/database';
import { DataError } from './errors';
import {
  checkIngredients,
  loggableRecipes,
  totalsOf,
  type Ingredient,
  type ScaledFood,
} from './recipes';
import { checkDateOnly, checkNumber } from './validation';

const GONE = "Ces portions préparées n'existent plus.";
// Servings are rounded to a few decimals: a sum may miss by a hair.
const EPSILON = 1e-6;

interface BatchRow {
  id: number;
  recipe_id: number;
  name: string;
  cooked_on: string;
  servings: number;
  adapted: number;
  discarded: number;
  logged: number;
}

interface BatchIngredientRow extends ScaledFood {
  batch_id: number;
}

const LOGGED = `(SELECT COALESCE(SUM(quantity), 0) FROM meal_item WHERE batch_id = b.id)`;
const FROM = 'FROM batch b JOIN recipe r ON r.id = b.recipe_id';

/** Reads batches with their totals, the newest cooked first. */
async function readBatches(db: Executor, where: string, params: SqlValue[]) {
  const batches = await db.query<BatchRow>(
    `SELECT b.id, b.recipe_id, r.name, b.cooked_on, b.servings, b.adapted, b.discarded,
            ${LOGGED} AS logged
     ${FROM} WHERE ${where}
     ORDER BY b.cooked_on DESC, b.id DESC`,
    params,
  );
  const ingredients = await db.query<BatchIngredientRow>(
    `SELECT i.batch_id, i.quantity, f.base_quantity, f.kcal, f.protein, f.carbs, f.fat
     FROM batch_ingredient i JOIN food_item f ON f.id = i.food_item_id
     WHERE i.batch_id IN (SELECT b.id ${FROM} WHERE ${where})`,
    params,
  );

  return batches.map((batch): Batch => ({
    id: batch.id,
    recipeId: batch.recipe_id,
    name: batch.name,
    cookedOn: batch.cooked_on,
    servings: batch.servings,
    remaining: Math.max(0, batch.servings - batch.logged),
    adapted: batch.adapted === 1,
    discarded: batch.discarded === 1,
    totals: totalsOf(ingredients.filter((item) => item.batch_id === batch.id)),
  }));
}

/** The batches of `ids`, by id; a missing one is left out. */
export async function readBatchesById(db: Executor, ids: number[]) {
  if (ids.length === 0) return new Map<number, Batch>();
  const batches = await readBatches(
    db,
    `b.id IN (${ids.map(() => '?').join(', ')})`,
    ids,
  );
  return new Map(batches.map((batch) => [batch.id, batch]));
}

/** Every batch, discarded or eaten ones included: journal lines point to them. */
export async function listBatches(db: Executor) {
  return readBatches(db, '1 = 1', []);
}

/**
 * The leftovers: batches not discarded with servings not logged yet, the
 * newest cooked first.
 */
export async function listLeftovers(db: Executor) {
  return readBatches(
    db,
    `b.discarded = 0 AND b.servings - ${LOGGED} > ${EPSILON}`,
    [],
  );
}

/** Same foods, quantities and sections in the same order. */
function sameIngredients(a: Ingredient[], b: Ingredient[]) {
  return (
    a.length === b.length &&
    a.every(
      (item, index) =>
        item.foodItemId === b[index].foodItemId &&
        item.quantity === b[index].quantity &&
        item.section === b[index].section,
    )
  );
}

/**
 * Stores a batch of a recipe cooked on `cookedOn`: a copy of the recipe, or
 * `cook`, its servings and ingredients changed for this time. Returns its id.
 * The recipe must be one a journal line can take.
 */
export async function createBatch(
  tx: Executor,
  recipeId: number,
  cook: CookInput | null,
  cookedOn: string,
) {
  const recipe = (await loggableRecipes(tx, [recipeId])).get(recipeId);
  if (!recipe) throw new DataError("Cette recette n'existe plus.");
  const own: Ingredient[] = recipe.ingredients.map((item) => ({
    foodItemId: item.foodItemId,
    quantity: item.quantity,
    section: item.section,
  }));

  let servings = recipe.servings;
  let ingredients = own;
  if (cook !== null) {
    servings = checkNumber(cook.servings, 'nombre de portions', {
      min: 0,
      exclusive: true,
      max: 50,
      integer: true,
    });
    ingredients = await checkIngredients(tx, cook.ingredients, recipeId);
  }
  const adapted =
    servings !== recipe.servings || !sameIngredients(ingredients, own);

  const { lastId } = await tx.run(
    'INSERT INTO batch (recipe_id, cooked_on, servings, adapted) VALUES (?, ?, ?, ?)',
    [recipeId, cookedOn, servings, adapted ? 1 : 0],
  );
  for (const [position, item] of ingredients.entries()) {
    await tx.run(
      `INSERT INTO batch_ingredient (batch_id, food_item_id, position, quantity, section)
       VALUES (?, ?, ?, ?, ?)`,
      [lastId, item.foodItemId, position, item.quantity, item.section],
    );
  }
  return lastId;
}

/**
 * Cooks a recipe ahead: all its servings, adapted or not, become a leftover
 * without anything logged.
 */
export async function cookRecipe(
  db: Database,
  recipeId: number,
  cook: CookInput,
  cookedOn: string,
) {
  const id = checkNumber(recipeId, 'recette', {
    min: 0,
    exclusive: true,
    integer: true,
  });
  const day = checkDateOnly(cookedOn, 'date');
  return db.transaction(async (tx) => {
    const batchId = await createBatch(tx, id, cook, day);
    return (await readBatchesById(tx, [batchId])).get(batchId)!;
  });
}

/**
 * Removes a leftover from the list. A batch nothing was logged from goes for
 * good; otherwise it stays, discarded, for the journal lines that took from
 * it.
 */
export async function discardBatch(db: Database, id: number) {
  return db.transaction(async (tx) => {
    const { changes } = await tx.run(
      `DELETE FROM batch WHERE id = ? AND discarded = 0
         AND NOT EXISTS (SELECT 1 FROM meal_item WHERE batch_id = batch.id)`,
      [id],
    );
    if (changes > 0) return;
    const { changes: marked } = await tx.run(
      'UPDATE batch SET discarded = 1 WHERE id = ? AND discarded = 0',
      [id],
    );
    if (marked === 0) throw new DataError(GONE);
  });
}

/** The servings logged from each batch of `ids`, by id. */
export async function loggedServings(tx: Executor, ids: number[]) {
  const sums = new Map<number, number>();
  if (ids.length === 0) return sums;
  const rows = await tx.query<{ id: number; logged: number }>(
    `SELECT b.id, ${LOGGED} AS logged FROM batch b
     WHERE b.id IN (${ids.map(() => '?').join(', ')})`,
    ids,
  );
  for (const { id, logged } of rows) sums.set(id, logged);
  return sums;
}

/**
 * Checked once the journal lines are written: no batch of `ids` gives more
 * servings than it has, and a discarded one gives no more than `before`, the
 * servings logged from it before the change.
 */
export async function checkBatchServings(
  tx: Executor,
  ids: number[],
  before: Map<number, number>,
) {
  if (ids.length === 0) return;
  const rows = await tx.query<{
    id: number;
    servings: number;
    discarded: number;
    logged: number;
  }>(
    `SELECT b.id, b.servings, b.discarded, ${LOGGED} AS logged FROM batch b
     WHERE b.id IN (${ids.map(() => '?').join(', ')})`,
    ids,
  );
  if (rows.length !== new Set(ids).size) throw new DataError(GONE);
  for (const { id, servings, discarded, logged } of rows) {
    if (discarded === 1 && logged > (before.get(id) ?? 0) + EPSILON) {
      throw new DataError('Ces portions préparées ont été retirées.');
    }
    if (logged > servings + EPSILON) {
      throw new DataError(
        'Il ne reste pas autant de portions : réduisez la quantité.',
      );
    }
  }
}
