import type {
  ShoppingFoodInput,
  ShoppingItem,
} from '../components/shopping/types';
import type { Database, Executor } from '../db/database';
import { DataError } from './errors';
import { checkNumber, checkText } from './validation';

const GONE = "Un des articles n'existe plus.";
const MAX_LINES = 200;
const AN_ID = { min: 0, exclusive: true, integer: true };

interface ShoppingRow {
  id: number;
  food_item_id: number | null;
  label: string | null;
  quantity: number | null;
  checked: number;
}

const toItem = (row: ShoppingRow): ShoppingItem => ({
  id: row.id,
  foodItemId: row.food_item_id,
  label: row.label,
  quantity: row.quantity,
  checked: row.checked === 1,
});

/** Every line of the list, in the order they were added. */
export async function listShopping(db: Executor) {
  const rows = await db.query<ShoppingRow>(
    'SELECT id, food_item_id, label, quantity, checked FROM shopping_item ORDER BY id',
  );
  return rows.map(toItem);
}

/** A list of line ids, each one a positive integer. */
function checkIds(ids: unknown) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new DataError(GONE);
  }
  return ids.map((id) => checkNumber(id, 'article', AN_ID));
}

/**
 * Adds foods to buy. A food already on the list gets the quantity added,
 * whatever it is for, and goes back to buy if it was checked.
 */
export async function addFoodsToShopping(
  db: Database,
  lines: ShoppingFoodInput[],
) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new DataError('Aucun aliment à ajouter.');
  }
  if (lines.length > MAX_LINES) {
    throw new DataError(`${MAX_LINES} articles maximum à la fois.`);
  }
  const checked = lines.map((line) => ({
    foodItemId: checkNumber(line.foodItemId, 'aliment', AN_ID),
    quantity: checkNumber(line.quantity, 'quantité', {
      min: 0,
      exclusive: true,
      max: 100000,
    }),
  }));

  await db.transaction(async (tx) => {
    const ids = [...new Set(checked.map(({ foodItemId }) => foodItemId))];
    const found = await tx.query<{ id: number }>(
      `SELECT id FROM food_item WHERE id IN (${ids.map(() => '?').join(', ')})`,
      ids,
    );
    if (found.length !== ids.length) {
      throw new DataError("Un des aliments n'existe plus.");
    }
    for (const { foodItemId, quantity } of checked) {
      await tx.run(
        `INSERT INTO shopping_item (food_item_id, quantity) VALUES (?, ?)
         ON CONFLICT (food_item_id) DO UPDATE
         SET quantity = quantity + excluded.quantity, checked = 0`,
        [foodItemId, quantity],
      );
    }
  });
  return listShopping(db);
}

/** Adds a free text to buy, such as "Sacs poubelle". */
export async function addLabelToShopping(db: Executor, label: string) {
  await db.run('INSERT INTO shopping_item (label) VALUES (?)', [
    checkText(label, 'article', 120),
  ]);
  return listShopping(db);
}

/** Marks lines as in the basket, or back to buy. */
export async function setShoppingChecked(
  db: Executor,
  ids: number[],
  checked: boolean,
) {
  const lines = checkIds(ids);
  const { changes } = await db.run(
    `UPDATE shopping_item SET checked = ? WHERE id IN (${lines.map(() => '?').join(', ')})`,
    [checked ? 1 : 0, ...lines],
  );
  if (changes === 0) throw new DataError(GONE);
  return listShopping(db);
}

/** Removes lines from the list. */
export async function removeShoppingItems(db: Executor, ids: number[]) {
  const lines = checkIds(ids);
  await db.run(
    `DELETE FROM shopping_item WHERE id IN (${lines.map(() => '?').join(', ')})`,
    lines,
  );
  return listShopping(db);
}

/** Removes the lines already in the basket. */
export async function removeCheckedShopping(db: Executor) {
  await db.run('DELETE FROM shopping_item WHERE checked = 1');
  return listShopping(db);
}

/** Empties the list. */
export async function clearShopping(db: Executor) {
  await db.run('DELETE FROM shopping_item');
  return listShopping(db);
}
