import { describe, expect, it } from 'vitest';

import { boundsOf, EMPTY_FILTER_CRITERIA, isFiltered } from './macroFilter';

const items = [
  { kcal: 120.4, protein: 3, carbs: 20, fat: 1.5 },
  { kcal: 450.6, protein: 25, carbs: 4, fat: 30 },
];

describe('boundsOf', () => {
  it('rounds the ends outwards', () => {
    expect(boundsOf(items).kcal).toEqual({ min: 120, max: 451 });
  });

  it('gives 0 to 100 for an empty list', () => {
    expect(boundsOf([]).fat).toEqual({ min: 0, max: 100 });
  });
});

describe('isFiltered', () => {
  const bounds = boundsOf(items);

  it('is false without a filter', () => {
    expect(isFiltered(EMPTY_FILTER_CRITERIA, bounds)).toBe(false);
  });

  it('is false when the ranges are the slider ends', () => {
    expect(isFiltered({ ...EMPTY_FILTER_CRITERIA, ...bounds }, bounds)).toBe(
      false,
    );
  });

  it('is true when a range is narrowed', () => {
    const criteria = {
      ...EMPTY_FILTER_CRITERIA,
      ...bounds,
      protein: { min: 10, max: 25 },
    };
    expect(isFiltered(criteria, bounds)).toBe(true);
  });

  it('is true when a category is kept', () => {
    expect(
      isFiltered({ ...EMPTY_FILTER_CRITERIA, category: 'dessert' }, bounds),
    ).toBe(true);
  });
});
