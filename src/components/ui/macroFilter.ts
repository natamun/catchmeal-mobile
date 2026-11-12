export type MacroKey = 'kcal' | 'protein' | 'carbs' | 'fat';

/** Calories and macros of a listed item: a food, or the totals of a meal. */
export type Macros = Record<MacroKey, number>;

export interface MacroFilter {
  min: number;
  max: number;
}

export interface SortOption {
  /** 'frequency' only in a list that knows how often its items are logged. */
  field: 'name' | 'frequency' | MacroKey;
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

/** The most logged first: what a list that knows its usage starts with. */
export const BY_FREQUENCY: SortOption = {
  field: 'frequency',
  direction: 'desc',
};

/** Whether a value is inside the chosen range. */
export function matchesMacro(value: number, filter: MacroFilter) {
  return value >= filter.min && value <= filter.max;
}

/** A range per macro: the slider ends, or the ranges being chosen. */
export type MacroRanges = Record<MacroKey, MacroFilter>;

const MACRO_KEYS: readonly MacroKey[] = ['kcal', 'protein', 'carbs', 'fat'];

/**
 * Smallest and largest value of each macro among the items, used as the
 * slider ends; 0 to 100 for an empty list.
 */
export function boundsOf(items: Macros[]): MacroRanges {
  const bounds = (key: MacroKey): MacroFilter => {
    if (items.length === 0) {
      return { min: 0, max: 100 };
    }
    const values = items.map((item) => item[key]);
    return {
      min: Math.floor(Math.min(...values)),
      max: Math.ceil(Math.max(...values)),
    };
  };
  return {
    kcal: bounds('kcal'),
    protein: bounds('protein'),
    carbs: bounds('carbs'),
    fat: bounds('fat'),
  };
}

/**
 * Whether a category is kept or a range is narrower than the items' values:
 * what fills the filter icon, and what a search without result names.
 */
export function isFiltered(criteria: FilterCriteria, bounds: MacroRanges) {
  return (
    criteria.category !== null ||
    MACRO_KEYS.some(
      (key) =>
        criteria[key].min > bounds[key].min ||
        criteria[key].max < bounds[key].max,
    )
  );
}
