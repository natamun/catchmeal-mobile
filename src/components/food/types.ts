export type QuantityUnit = 'GRAM' | 'MILLILITER' | 'PIECE';

/** Short unit written after a quantity; "x" means pieces. */
export const UNIT_LABELS: Record<QuantityUnit, string> = {
  GRAM: 'g',
  MILLILITER: 'ml',
  PIECE: 'x',
};

/**
 * A food of the user's library. kcal and macros are given for baseQuantity of
 * baseUnit (e.g. per 100 g). A food in g or ml can have a portion, such as a
 * biscuit of 12 g, to be logged by the piece. An archived food is hidden from
 * the lists but kept for the meals that use it.
 */
export interface FoodItem {
  id: number;
  name: string;
  brand: string | null;
  barcode: string | null;
  baseQuantity: number;
  baseUnit: QuantityUnit;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** The weight of one portion in baseUnit, null without a portion. */
  portionQuantity: number | null;
  /** Its name, such as "biscuit"; null says "portion". */
  portionName: string | null;
  archived: boolean;
}

export type FoodItemInput = Omit<FoodItem, 'id' | 'archived'>;

/**
 * A product found on Open Food Facts. A null value is missing on their side;
 * the form leaves that field empty.
 */
export interface OffProduct {
  barcode: string;
  name: string | null;
  brand: string | null;
  baseQuantity: number;
  baseUnit: QuantityUnit;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  /** The portion of one piece, when their serving is one. */
  portionQuantity: number | null;
  portionName: string | null;
}
