import type {
  FoodItem,
  FoodItemInput,
  QuantityUnit,
} from '../components/food/types';
import type { Executor } from '../db/database';
import { DataError } from './errors';
import {
  checkChoice,
  checkNumber,
  checkOptionalText,
  checkText,
} from './validation';

export const QUANTITY_UNITS: readonly QuantityUnit[] = [
  'GRAM',
  'MILLILITER',
  'PIECE',
];

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
  archived: number;
}

const COLUMNS =
  'id, name, brand, barcode, base_quantity, base_unit, kcal, protein, carbs, fat, archived';

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
    archived: row.archived === 1,
  };
}

/**
 * Checks a food before saving it and returns it cleaned: name and brand
 * trimmed, an empty brand or barcode stored as null. Throws a DataError.
 */
export function validateFoodItem(input: FoodItemInput): FoodItemInput {
  const barcode = checkOptionalText(input.barcode, 'code-barres', 14);
  if (barcode !== null && !BARCODE.test(barcode)) {
    throw new DataError('Valeur invalide : code-barres.');
  }
  const amount = { min: 0 };

  return {
    name: checkText(input.name, 'nom', 120),
    brand: checkOptionalText(input.brand, 'marque', 80),
    barcode,
    baseQuantity: checkNumber(input.baseQuantity, 'quantité de base', {
      min: 0,
      exclusive: true,
    }),
    baseUnit: checkChoice(input.baseUnit, 'unité', QUANTITY_UNITS),
    kcal: checkNumber(input.kcal, 'calories', amount),
    protein: checkNumber(input.protein, 'protéines', amount),
    carbs: checkNumber(input.carbs, 'glucides', amount),
    fat: checkNumber(input.fat, 'lipides', amount),
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
    `INSERT INTO food_item (name, brand, barcode, base_quantity, base_unit, kcal, protein, carbs, fat)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
         kcal = ?, protein = ?, carbs = ?, fat = ?
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
