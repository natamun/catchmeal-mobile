import {
  MEAL_TYPES,
  type Meal,
  type MealFoodItem,
  type MealInput,
  type MealItemInput,
  type MealType,
} from '../components/meal/types';
import type { Batch } from '../components/recipe/types';
import type { Database, Executor, SqlValue } from '../db/database';
import {
  checkBatchServings,
  createBatch,
  loggedServings,
  readBatchesById,
} from './batches';
import { DataError } from './errors';
import { loggableRecipes } from './recipes';
import {
  checkChoice,
  checkDateOnly,
  checkNumber,
  checkOptionalText,
} from './validation';

const GONE = "Ce repas n'existe plus.";
const MISSING_FOOD = "Un des aliments n'existe plus.";
const MISSING_RECIPE = "Une des recettes n'existe plus.";
const MISSING_BATCH = "Des portions préparées n'existent plus.";

interface MealRow {
  id: number;
  name: string | null;
  type_meal: MealType | null;
  logged_at: string | null;
}

interface ItemRow {
  id: number;
  meal_id: number;
  food_item_id: number | null;
  recipe_id: number | null;
  batch_id: number | null;
  quantity: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodRow {
  id: number;
  base_quantity: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** A line ready to be stored, its calories and macros already computed. */
type ItemValues = Omit<MealFoodItem, 'id'>;

/** Which meals listMeals returns. */
export interface MealFilter {
  /** true: journal meals only, false: library meals only. */
  logged?: boolean;
  /** The journal meals of one day (YYYY-MM-DD). */
  date?: string;
}

const amount = { min: 0 };
const AN_ID = { min: 0, exclusive: true, integer: true };

/**
 * Checks the lines: a food, servings of a recipe (adapted or not), servings
 * of a leftover, or a quick add, which must give its own calories and macros.
 * An adapted recipe is checked when its batch is stored.
 */
function validateItems(items: unknown): MealItemInput[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new DataError('Le repas doit contenir au moins un aliment.');
  }
  return (items as MealItemInput[]).map((item) => {
    const quantity = checkNumber(item.quantity, 'quantité', {
      min: 0,
      exclusive: true,
    });
    if (item.foodItemId !== undefined && item.recipeId !== undefined) {
      throw new DataError(
        'Une ligne est un aliment ou une recette, pas les deux.',
      );
    }
    if (
      item.batchId !== undefined &&
      (item.foodItemId !== undefined || item.recipeId !== undefined)
    ) {
      throw new DataError(
        'Une ligne est un plat préparé ou un aliment, pas les deux.',
      );
    }
    if (item.adapted !== undefined && item.recipeId === undefined) {
      throw new DataError('Seule une recette peut être adaptée.');
    }
    if (item.batchId !== undefined) {
      return {
        batchId: checkNumber(item.batchId, 'plat préparé', AN_ID),
        quantity,
      };
    }
    if (item.foodItemId !== undefined) {
      return {
        foodItemId: checkNumber(item.foodItemId, 'aliment', AN_ID),
        quantity,
      };
    }
    if (item.recipeId !== undefined) {
      return {
        recipeId: checkNumber(item.recipeId, 'recette', AN_ID),
        quantity,
        ...(item.adapted !== undefined && { adapted: item.adapted }),
      };
    }
    return {
      quantity,
      kcal: checkNumber(item.kcal, 'calories', amount),
      protein: checkNumber(item.protein, 'protéines', amount),
      carbs: checkNumber(item.carbs, 'glucides', amount),
      fat: checkNumber(item.fat, 'lipides', amount),
    };
  });
}

/** A journal meal needs its type: it sorts the meal into a section. */
function checkLoggedMealHasType(
  loggedAt: string | null,
  typeMeal: MealType | null,
) {
  if (loggedAt !== null && typeMeal === null) {
    throw new DataError('Le type de repas est obligatoire.');
  }
}

/** Where the lines go, which decides what they may hold. */
interface Target {
  /** Journal lines, which may take leftovers and adapt a recipe. */
  journal: boolean;
  /**
   * The day a recipe line is cooked, for new journal lines: the servings it
   * leaves become a leftover. Null when lines are only edited.
   */
  cookOn: string | null;
}

/**
 * Computes each line: a food line takes the food's values scaled to the
 * quantity eaten, a recipe line its servings of the recipe's totals and a
 * leftover line its servings of the batch's, now, so editing the food or the
 * recipe later leaves this meal unchanged. A new journal line of a recipe
 * that leaves servings, or adapted, stores its batch first. An archived food
 * or recipe is only accepted when a meal already holds it (editing that meal
 * must keep working).
 */
async function buildItems(
  tx: Executor,
  items: MealItemInput[],
  { journal, cookOn }: Target,
): Promise<ItemValues[]> {
  if (
    !journal &&
    items.some((item) => item.batchId !== undefined || item.adapted)
  ) {
    throw new DataError(
      'Un plat préparé ou une recette adaptée va dans le journal.',
    );
  }
  const ids = [
    ...new Set(
      items
        .map(({ foodItemId }) => foodItemId)
        .filter((id): id is number => id !== undefined),
    ),
  ];
  const foods = ids.length
    ? await tx.query<FoodRow>(
        `SELECT id, base_quantity, kcal, protein, carbs, fat FROM food_item
         WHERE id IN (${ids.map(() => '?').join(', ')})
           AND (archived = 0 OR EXISTS (SELECT 1 FROM meal_item WHERE food_item_id = food_item.id))`,
        ids,
      )
    : [];
  if (foods.length !== ids.length) {
    throw new DataError(MISSING_FOOD);
  }
  const foodById = new Map(foods.map((food) => [food.id, food]));

  const recipeIds = [
    ...new Set(
      items
        .map(({ recipeId }) => recipeId)
        .filter((id): id is number => id !== undefined),
    ),
  ];
  const recipeById = await loggableRecipes(tx, recipeIds);
  if (recipeById.size !== recipeIds.length) {
    throw new DataError(MISSING_RECIPE);
  }

  const batchIds = [
    ...new Set(
      items
        .map(({ batchId }) => batchId)
        .filter((id): id is number => id !== undefined),
    ),
  ];
  const batchById = await readBatchesById(tx, batchIds);
  if (batchById.size !== batchIds.length) {
    throw new DataError(MISSING_BATCH);
  }

  const values: ItemValues[] = [];
  for (const item of items) {
    if (item.recipeId !== undefined) {
      const recipe = recipeById.get(item.recipeId)!;
      const cooked =
        cookOn !== null &&
        (item.adapted !== undefined || item.quantity < recipe.servings);
      if (!cooked && item.adapted !== undefined) {
        throw new DataError('Une recette adaptée se mange le jour même.');
      }
      if (cooked) {
        const batchId = await createBatch(
          tx,
          item.recipeId,
          item.adapted ?? null,
          cookOn,
        );
        const batch = (await readBatchesById(tx, [batchId])).get(batchId)!;
        batchById.set(batchId, batch);
        values.push(batchLine(batch, item.quantity));
        continue;
      }
      const scale = item.quantity / recipe.servings;
      values.push({
        foodItemId: null,
        recipeId: item.recipeId,
        batchId: null,
        quantity: item.quantity,
        kcal: recipe.totals.kcal * scale,
        protein: recipe.totals.protein * scale,
        carbs: recipe.totals.carbs * scale,
        fat: recipe.totals.fat * scale,
      });
      continue;
    }
    if (item.batchId !== undefined) {
      values.push(batchLine(batchById.get(item.batchId)!, item.quantity));
      continue;
    }
    if (item.foodItemId === undefined) {
      values.push({
        foodItemId: null,
        recipeId: null,
        batchId: null,
        quantity: item.quantity,
        kcal: item.kcal!,
        protein: item.protein!,
        carbs: item.carbs!,
        fat: item.fat!,
      });
      continue;
    }
    const food = foodById.get(item.foodItemId)!;
    const scale = item.quantity / food.base_quantity;
    values.push({
      foodItemId: item.foodItemId,
      recipeId: null,
      batchId: null,
      quantity: item.quantity,
      kcal: food.kcal * scale,
      protein: food.protein * scale,
      carbs: food.carbs * scale,
      fat: food.fat * scale,
    });
  }
  return values;
}

/** Servings of a batch: its totals scaled to them. */
function batchLine(batch: Batch, quantity: number): ItemValues {
  const scale = quantity / batch.servings;
  return {
    foodItemId: null,
    recipeId: batch.recipeId,
    batchId: batch.id,
    quantity,
    kcal: batch.totals.kcal * scale,
    protein: batch.totals.protein * scale,
    carbs: batch.totals.carbs * scale,
    fat: batch.totals.fat * scale,
  };
}

/** The batches the lines take from. */
const batchesOf = (lines: { batchId?: number | null }[]) => [
  ...new Set(
    lines
      .map(({ batchId }) => batchId)
      .filter((id): id is number => id !== undefined && id !== null),
  ),
];

async function insertItems(tx: Executor, mealId: number, items: ItemValues[]) {
  for (const item of items) {
    await tx.run(
      `INSERT INTO meal_item (meal_id, food_item_id, recipe_id, batch_id, quantity, kcal, protein, carbs, fat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mealId,
        item.foodItemId,
        item.recipeId,
        item.batchId,
        item.quantity,
        item.kcal,
        item.protein,
        item.carbs,
        item.fat,
      ],
    );
  }
}

/** Reads meals with their lines, in a single query for all the lines. */
async function readMeals(db: Executor, where: string, params: SqlValue[]) {
  const meals = await db.query<MealRow>(
    `SELECT id, name, type_meal, logged_at FROM meal WHERE ${where} ORDER BY id DESC`,
    params,
  );
  const items = await db.query<ItemRow>(
    `SELECT id, meal_id, food_item_id, recipe_id, batch_id, quantity, kcal, protein, carbs, fat FROM meal_item
     WHERE meal_id IN (SELECT id FROM meal WHERE ${where}) ORDER BY id`,
    params,
  );

  return meals.map((meal): Meal => ({
    id: meal.id,
    name: meal.name,
    typeMeal: meal.type_meal,
    loggedAt: meal.logged_at,
    items: items
      .filter((item) => item.meal_id === meal.id)
      .map((item) => ({
        id: item.id,
        foodItemId: item.food_item_id,
        recipeId: item.recipe_id,
        batchId: item.batch_id,
        quantity: item.quantity,
        kcal: item.kcal,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
  }));
}

async function readMeal(db: Executor, id: number) {
  const [meal] = await readMeals(db, 'id = ?', [id]);
  return meal;
}

/**
 * Meals with their lines, the newest first: every meal, the journal or the
 * library ones, or the journal meals of one day.
 */
export async function listMeals(db: Executor, filter: MealFilter = {}) {
  if (filter.date !== undefined) {
    return readMeals(db, 'logged_at = ?', [checkDateOnly(filter.date, 'date')]);
  }
  if (filter.logged === undefined) {
    return readMeals(db, '1 = 1', []);
  }
  return readMeals(
    db,
    filter.logged ? 'logged_at IS NOT NULL' : 'logged_at IS NULL',
    [],
  );
}

/**
 * Saves a journal meal (with a day and a type) or a library meal (without a
 * day), all its lines at once.
 */
export async function createMeal(db: Database, input: MealInput) {
  const name = checkOptionalText(input.name, 'nom du repas', 120);
  const typeMeal =
    input.typeMeal === undefined || input.typeMeal === null
      ? null
      : checkChoice(input.typeMeal, 'type de repas', MEAL_TYPES);
  const loggedAt =
    input.loggedAt === undefined ? null : checkDateOnly(input.loggedAt, 'date');
  checkLoggedMealHasType(loggedAt, typeMeal);
  const items = validateItems(input.items);

  return db.transaction(async (tx) => {
    const before = await loggedServings(tx, batchesOf(items));
    const values = await buildItems(tx, items, {
      journal: loggedAt !== null,
      cookOn: loggedAt,
    });
    const { lastId } = await tx.run(
      'INSERT INTO meal (name, type_meal, logged_at) VALUES (?, ?, ?)',
      [name, typeMeal, loggedAt],
    );
    await insertItems(tx, lastId, values);
    await checkBatchServings(tx, batchesOf(values), before);
    return readMeal(tx, lastId);
  });
}

/**
 * Changes the fields given; a field left out stays as it is. Sending `items`
 * replaces all the lines of the meal.
 */
export async function updateMeal(
  db: Database,
  id: number,
  input: Partial<MealInput>,
) {
  const name =
    input.name === undefined
      ? undefined
      : checkOptionalText(input.name, 'nom du repas', 120);
  const typeMeal =
    input.typeMeal === undefined || input.typeMeal === null
      ? input.typeMeal
      : checkChoice(input.typeMeal, 'type de repas', MEAL_TYPES);
  const loggedAt =
    input.loggedAt === undefined
      ? undefined
      : checkDateOnly(input.loggedAt, 'date');
  const items =
    input.items === undefined ? undefined : validateItems(input.items);

  return db.transaction(async (tx) => {
    const [current] = await tx.query<MealRow>(
      'SELECT id, name, type_meal, logged_at FROM meal WHERE id = ?',
      [id],
    );
    if (!current) throw new DataError(GONE);

    const next = {
      name: name === undefined ? current.name : name,
      typeMeal: typeMeal === undefined ? current.type_meal : typeMeal,
      loggedAt: loggedAt ?? current.logged_at,
    };
    checkLoggedMealHasType(next.loggedAt, next.typeMeal);
    // Computed before the old lines go, so a food they hold still counts as
    // used by a meal.
    const before = await loggedServings(tx, batchesOf(items ?? []));
    const values =
      items &&
      (await buildItems(tx, items, {
        journal: next.loggedAt !== null,
        cookOn: null,
      }));

    await tx.run(
      'UPDATE meal SET name = ?, type_meal = ?, logged_at = ? WHERE id = ?',
      [next.name, next.typeMeal, next.loggedAt, id],
    );
    if (values) {
      await tx.run('DELETE FROM meal_item WHERE meal_id = ?', [id]);
      await insertItems(tx, id, values);
      await checkBatchServings(tx, batchesOf(values), before);
    }
    return readMeal(tx, id);
  });
}

/**
 * Changes one row of a journal section, which may hold several lines (the
 * same food logged twice): they become `line`, kept in the place of the
 * first one, or go with null. A meal left without lines is deleted. The other
 * lines of the section keep their values. The lines must be journal lines of
 * one section.
 */
export async function replaceLoggedLines(
  db: Database,
  itemIds: number[],
  line: MealItemInput | null,
) {
  // The same line twice finds fewer lines than ids: refused as gone.
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new DataError('Aucune ligne du journal à changer.');
  }
  const ids = itemIds.map((id) => checkNumber(id, 'ligne', AN_ID));
  const [input] = line === null ? [null] : validateItems([line]);

  return db.transaction(async (tx) => {
    const marks = ids.map(() => '?').join(', ');
    const rows = await tx.query<{
      id: number;
      meal_id: number;
      type_meal: MealType | null;
      logged_at: string | null;
    }>(
      `SELECT meal_item.id, meal_id, type_meal, logged_at FROM meal_item
       JOIN meal ON meal.id = meal_item.meal_id
       WHERE meal_item.id IN (${marks}) ORDER BY meal_item.id`,
      ids,
    );
    if (rows.length !== ids.length) throw new DataError(GONE);
    if (rows.some(({ logged_at }) => logged_at === null)) {
      throw new DataError('Seules les lignes du journal changent ici.');
    }
    const sections = new Set(
      rows.map(({ type_meal, logged_at }) => `${logged_at} ${type_meal}`),
    );
    if (sections.size > 1) {
      throw new DataError('Ces lignes sont dans plusieurs sections.');
    }

    // Computed before the old lines go, so an archived food they hold still
    // counts as used by a meal.
    const before = await loggedServings(tx, batchesOf(input ? [input] : []));
    const [values] = input
      ? await buildItems(tx, [input], { journal: true, cookOn: null })
      : [null];
    const [first, ...others] = rows;
    const gone = values ? others : rows;
    if (values) {
      await tx.run(
        `UPDATE meal_item SET food_item_id = ?, recipe_id = ?, batch_id = ?, quantity = ?, kcal = ?, protein = ?, carbs = ?, fat = ?
         WHERE id = ?`,
        [
          values.foodItemId,
          values.recipeId,
          values.batchId,
          values.quantity,
          values.kcal,
          values.protein,
          values.carbs,
          values.fat,
          first.id,
        ],
      );
    }
    for (const { id } of gone) {
      await tx.run('DELETE FROM meal_item WHERE id = ?', [id]);
    }
    if (values) await checkBatchServings(tx, batchesOf([values]), before);
    for (const mealId of new Set(gone.map(({ meal_id }) => meal_id))) {
      await tx.run(
        'DELETE FROM meal WHERE id = ? AND NOT EXISTS (SELECT 1 FROM meal_item WHERE meal_id = ?)',
        [mealId, mealId],
      );
    }
  });
}

/** Deletes a meal for real, with its lines (meals are not archived). */
export async function deleteMeal(db: Executor, id: number) {
  const { changes } = await db.run('DELETE FROM meal WHERE id = ?', [id]);
  if (changes === 0) throw new DataError(GONE);
}
