import type {
  FoodItem,
  FoodItemInput,
  QuantityUnit,
} from '../components/food/types';
import type { Executor } from '../db/database';
import { DataError } from './errors';
import {
  checkChoice,
  checkDateOnly,
  checkNumber,
  checkOptionalNumber,
  checkOptionalText,
  checkText,
} from './validation';

const QUANTITY_UNITS: readonly QuantityUnit[] = ['GRAM', 'MILLILITER', 'PIECE'];

const BARCODE = /^\d{8,14}$/;

const GONE = "Cet aliment n'existe plus.";

interface FoodItemRow {
  id: number;
  name: string;
  brand: string | null;
  barcode: string | null;
  base_quantity: number;
  base_unit: QuantityUnit;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  portion_quantity: number | null;
  portion_name: string | null;
  archived: number;
}

const COLUMNS =
  'id, name, brand, barcode, base_quantity, base_unit, kcal, protein, carbs, fat, portion_quantity, portion_name, archived';

function toFoodItem(row: FoodItemRow): FoodItem {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    baseQuantity: row.base_quantity,
    baseUnit: row.base_unit,
    kcal: row.kcal,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    portionQuantity: row.portion_quantity,
    portionName: row.portion_name,
    archived: row.archived === 1,
  };
}

/**
 * Checks a food before saving it and returns it cleaned: name and brand
 * trimmed, an empty brand or barcode stored as null. A portion needs its
 * weight, and only a food in g or ml has one: a food by the piece is counted
 * by the piece already. Throws a DataError.
 */
function validateFoodItem(input: FoodItemInput): FoodItemInput {
  const barcode = checkOptionalText(input.barcode, 'code-barres', 14);
  if (barcode !== null && !BARCODE.test(barcode)) {
    throw new DataError('Valeur invalide : code-barres.');
  }
  const amount = { min: 0 };
  const baseUnit = checkChoice(input.baseUnit, 'unité', QUANTITY_UNITS);
  const portionQuantity = checkOptionalNumber(
    input.portionQuantity,
    'poids de la portion',
    { min: 0, exclusive: true, max: 5000 },
  );
  if (portionQuantity !== null && baseUnit === 'PIECE') {
    throw new DataError('Un aliment à la pièce ne prend pas de portion.');
  }

  return {
    name: checkText(input.name, 'nom', 120),
    brand: checkOptionalText(input.brand, 'marque', 80),
    barcode,
    baseQuantity: checkNumber(input.baseQuantity, 'quantité de base', {
      min: 0,
      exclusive: true,
    }),
    baseUnit,
    kcal: checkNumber(input.kcal, 'calories', amount),
    protein: checkNumber(input.protein, 'protéines', amount),
    carbs: checkNumber(input.carbs, 'glucides', amount),
    fat: checkNumber(input.fat, 'lipides', amount),
    portionQuantity,
    portionName:
      portionQuantity === null
        ? null
        : checkOptionalText(input.portionName, 'nom de la portion', 30),
  };
}

async function findFoodItem(db: Executor, id: number) {
  const [row] = await db.query<FoodItemRow>(
    `SELECT ${COLUMNS} FROM food_item WHERE id = ?`,
    [id],
  );
  return row ? toFoodItem(row) : null;
}

/**
 * The whole food library sorted by name as a French reader expects (case and
 * accents ignored), archived foods included: the screens hide them.
 */
export async function listFoodItems(db: Executor) {
  const rows = await db.query<FoodItemRow>(`SELECT ${COLUMNS} FROM food_item`);
  return rows
    .map(toFoodItem)
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    );
}

/** Adds a food to the library. */
export async function createFoodItem(db: Executor, input: FoodItemInput) {
  const food = validateFoodItem(input);
  const { lastId } = await db.run(
    `INSERT INTO food_item (name, brand, barcode, base_quantity, base_unit, kcal, protein, carbs, fat, portion_quantity, portion_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      food.name,
      food.brand,
      food.barcode,
      food.baseQuantity,
      food.baseUnit,
      food.kcal,
      food.protein,
      food.carbs,
      food.fat,
      food.portionQuantity,
      food.portionName,
    ],
  );
  return (await findFoodItem(db, lastId))!;
}

/**
 * Saves an edited food. An archived food cannot change any more: the meals
 * logged with it keep their own copy of its values anyway.
 */
export async function updateFoodItem(
  db: Executor,
  id: number,
  input: FoodItemInput,
) {
  const food = validateFoodItem(input);
  const { changes } = await db.run(
    `UPDATE food_item
     SET name = ?, brand = ?, barcode = ?, base_quantity = ?, base_unit = ?,
         kcal = ?, protein = ?, carbs = ?, fat = ?,
         portion_quantity = ?, portion_name = ?
     WHERE id = ? AND archived = 0`,
    [
      food.name,
      food.brand,
      food.barcode,
      food.baseQuantity,
      food.baseUnit,
      food.kcal,
      food.protein,
      food.carbs,
      food.fat,
      food.portionQuantity,
      food.portionName,
      id,
    ],
  );
  if (changes === 0) throw new DataError(GONE);
  return (await findFoodItem(db, id))!;
}

/**
 * Archives a food instead of deleting it, so the meals that use it keep their
 * link to it.
 */
export async function archiveFoodItem(db: Executor, id: number) {
  const { changes } = await db.run(
    'UPDATE food_item SET archived = 1 WHERE id = ? AND archived = 0',
    [id],
  );
  if (changes === 0) throw new DataError(GONE);
  return (await findFoodItem(db, id))!;
}

/** How often a food was logged in the journal, for its sheet and the sort. */
export interface FoodUsage {
  foodItemId: number;
  /** Every journal line of the food. */
  count: number;
  /** Those of the last 30 days, today included. */
  last30Days: number;
  /** Those of the last 90 days, today included: what the lists sort by. */
  last90Days: number;
  /** The day of the latest log (YYYY-MM-DD). */
  lastDay: string;
  /** The quantity of the latest log, in the food's unit. */
  lastQuantity: number;
}

interface UsageRow {
  food_item_id: number;
  count: number;
  last_30_days: number;
  last_90_days: number;
  last_day: string;
  last_quantity: number;
}

/**
 * The journal use of every food logged at least once, counted on `today`
 * (YYYY-MM-DD). Library meals and recipes do not count: only what was eaten.
 */
export async function listFoodUsage(db: Executor, today: string) {
  const day = checkDateOnly(today, 'date du jour');
  const rows = await db.query<UsageRow>(
    `SELECT mi.food_item_id AS food_item_id,
       COUNT(*) AS count,
       SUM(m.logged_at > date(?, '-30 days')) AS last_30_days,
       SUM(m.logged_at > date(?, '-90 days')) AS last_90_days,
       MAX(m.logged_at) AS last_day,
       (SELECT latest.quantity FROM meal_item latest
          JOIN meal lm ON lm.id = latest.meal_id
         WHERE latest.food_item_id = mi.food_item_id AND lm.logged_at IS NOT NULL
         ORDER BY lm.logged_at DESC, latest.id DESC LIMIT 1) AS last_quantity
     FROM meal_item mi JOIN meal m ON m.id = mi.meal_id
     WHERE m.logged_at IS NOT NULL AND mi.food_item_id IS NOT NULL
     GROUP BY mi.food_item_id`,
    [day, day],
  );
  return rows.map((row): FoodUsage => ({
    foodItemId: row.food_item_id,
    count: row.count,
    last30Days: row.last_30_days,
    last90Days: row.last_90_days,
    lastDay: row.last_day,
    lastQuantity: row.last_quantity,
  }));
}
