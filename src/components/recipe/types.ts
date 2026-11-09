export type RecipeCategory =
  | 'BREAKFAST'
  | 'STARTER'
  | 'MAIN'
  | 'SIDE'
  | 'DESSERT'
  | 'SNACK'
  | 'SAUCE'
  | 'DRINK';

/** The categories in the order of a menu. */
export const RECIPE_CATEGORIES: readonly RecipeCategory[] = [
  'BREAKFAST',
  'STARTER',
  'MAIN',
  'SIDE',
  'DESSERT',
  'SNACK',
  'SAUCE',
  'DRINK',
];

export const RECIPE_CATEGORY_LABELS: Record<RecipeCategory, string> = {
  BREAKFAST: 'Petit-déjeuner',
  STARTER: 'Entrée',
  MAIN: 'Plat',
  SIDE: 'Accompagnement',
  DESSERT: 'Dessert',
  SNACK: 'Collation',
  SAUCE: 'Sauce',
  DRINK: 'Boisson',
};

/** Calories and macros, in kcal and grams. */
export interface Nutrition {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** A food of the library in a recipe, its quantity in the food's base unit. */
export interface RecipeIngredient {
  id: number;
  foodItemId: number;
  quantity: number;
}

/**
 * A recipe of the user's library, made for `servings` servings. Its totals
 * come from the current values of its foods; a serving logged in the journal
 * keeps the values of that day. An archived recipe is hidden from the lists
 * but kept for the meals that logged it.
 */
export interface Recipe {
  id: number;
  name: string;
  servings: number;
  category: RecipeCategory | null;
  prepMinutes: number | null;
  /** How it cooks, written freely: "25 min au four à 180 °C". */
  cooking: string | null;
  /** Free notes: replacements, storage, anything else. */
  notes: string | null;
  ingredients: RecipeIngredient[];
  /** The preparation, one text per step, in order. */
  steps: string[];
  /** Calories and macros of the whole recipe. */
  totals: Nutrition;
  archived: boolean;
}

export interface RecipeInput {
  name: string;
  servings: number;
  category: RecipeCategory | null;
  prepMinutes: number | null;
  cooking: string | null;
  notes: string | null;
  ingredients: { foodItemId: number; quantity: number }[];
  steps: string[];
}
