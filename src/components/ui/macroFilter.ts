export type MacroKey = 'kcal' | 'protein' | 'carbs' | 'fat';

/** Calories and macros of a listed item: a food, or the totals of a meal. */
export type Macros = Record<MacroKey, number>;

export interface MacroFilter {
  min: number;
  max: number;
}

export interface SortOption {
  field: 'name' | MacroKey;
  direction: 'asc' | 'desc';
}

/**
 * Search text, macro ranges and sort chosen in a food, meal or recipe list,
 * and for the recipes a category.
 */
export interface FilterCriteria {
  query: string;
  /** The category kept, null for all. */
  category: string | null;
  kcal: MacroFilter;
  protein: MacroFilter;
  carbs: MacroFilter;
  fat: MacroFilter;
  sort: SortOption;
}

/** No filter: unlimited ranges, every category, sorted by name. */
export const EMPTY_FILTER_CRITERIA: FilterCriteria = {
  query: '',
  category: null,
  kcal: { min: -Infinity, max: Infinity },
  protein: { min: -Infinity, max: Infinity },
  carbs: { min: -Infinity, max: Infinity },
  fat: { min: -Infinity, max: Infinity },
  sort: { field: 'name', direction: 'asc' },
};

/** Whether a value is inside the chosen range. */
export function matchesMacro(value: number, filter: MacroFilter) {
  return value >= filter.min && value <= filter.max;
}
