import {
  MEAL_TYPES,
  type Meal,
  type MealFoodItem,
  type MealInput,
  type MealItemInput,
  type MealType,
} from '../components/meal/types';
import type { Database, Executor, SqlValue } from '../db/database';
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
 * Checks the lines: a food, servings of a recipe, or a quick add, which must
 * give its own calories and macros.
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

/**
 * Computes each line: a food line takes the food's values scaled to the
 * quantity eaten, and a recipe line its servings of the recipe's totals, now,
 * so editing the food or the recipe later leaves this meal unchanged. An
 * archived food or recipe is only accepted when a meal already holds it
 * (editing that meal must keep working).
 */
async function buildItems(
  tx: Executor,
  items: MealItemInput[],
): Promise<ItemValues[]> {
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

  return items.map((item) => {
    if (item.recipeId !== undefined) {
      const { servings, totals } = recipeById.get(item.recipeId)!;
      const scale = item.quantity / servings;
      return {
        foodItemId: null,
        recipeId: item.recipeId,
        quantity: item.quantity,
        kcal: totals.kcal * scale,
        protein: totals.protein * scale,
        carbs: totals.carbs * scale,
        fat: totals.fat * scale,
      };
    }
    if (item.foodItemId === undefined) {
      return {
        foodItemId: null,
        recipeId: null,
        quantity: item.quantity,
        kcal: item.kcal!,
        protein: item.protein!,
        carbs: item.carbs!,
        fat: item.fat!,
      };
    }
    const food = foodById.get(item.foodItemId)!;
    const scale = item.quantity / food.base_quantity;
    return {
      foodItemId: item.foodItemId,
      recipeId: null,
      quantity: item.quantity,
      kcal: food.kcal * scale,
      protein: food.protein * scale,
      carbs: food.carbs * scale,
      fat: food.fat * scale,
    };
  });
}

async function insertItems(tx: Executor, mealId: number, items: ItemValues[]) {
  for (const item of items) {
    await tx.run(
      `INSERT INTO meal_item (meal_id, food_item_id, recipe_id, quantity, kcal, protein, carbs, fat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mealId,
        item.foodItemId,
        item.recipeId,
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
    `SELECT id, meal_id, food_item_id, recipe_id, quantity, kcal, protein, carbs, fat FROM meal_item
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
    const values = await buildItems(tx, items);
    const { lastId } = await tx.run(
      'INSERT INTO meal (name, type_meal, logged_at) VALUES (?, ?, ?)',
      [name, typeMeal, loggedAt],
    );
    await insertItems(tx, lastId, values);
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
    const values = items && (await buildItems(tx, items));

    await tx.run(
      'UPDATE meal SET name = ?, type_meal = ?, logged_at = ? WHERE id = ?',
      [next.name, next.typeMeal, next.loggedAt, id],
    );
    if (values) {
      await tx.run('DELETE FROM meal_item WHERE meal_id = ?', [id]);
      await insertItems(tx, id, values);
    }
    return readMeal(tx, id);
  });
}

/** Deletes a meal for real, with its lines (meals are not archived). */
export async function deleteMeal(db: Executor, id: number) {
  const { changes } = await db.run('DELETE FROM meal WHERE id = ?', [id]);
  if (changes === 0) throw new DataError(GONE);
}
