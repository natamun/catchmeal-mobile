import { describe, expect, it } from 'vitest';

import { pluralOf, portionLabel, wholePortions } from './portion';

describe('pluralOf', () => {
  it.each([
    ['biscuit', 'biscuits'],
    ['gâteau', 'gâteaux'],
    ['noix', 'noix'],
    ['carré', 'carrés'],
  ])('writes %s as %s', (name, plural) => {
    expect(pluralOf(name)).toBe(plural);
  });
});

describe('portionLabel', () => {
  it('counts the portions with their name, or "portion" without one', () => {
    expect(portionLabel({ portionName: 'biscuit' }, 1)).toBe('1 biscuit');
    expect(portionLabel({ portionName: 'biscuit' }, 4)).toBe('4 biscuits');
    expect(portionLabel({ portionName: null }, 2.5)).toBe('2,5 portions');
  });
});

describe('wholePortions', () => {
  const biscuit = { portionQuantity: 12 };

  it('counts the whole portions of a quantity', () => {
    expect(wholePortions(biscuit, 48)).toBe(4);
  });

  it('gives nothing between two portions or without a portion', () => {
    expect(wholePortions(biscuit, 50)).toBeNull();
    expect(wholePortions(biscuit, 5)).toBeNull();
    expect(wholePortions({ portionQuantity: null }, 48)).toBeNull();
  });
});
