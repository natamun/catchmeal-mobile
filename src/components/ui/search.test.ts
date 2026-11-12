import { describe, expect, it } from 'vitest';

import { matchesFood } from '../food/search';
import type { FoodItem } from '../food/types';
import { isSameName, matchesSearch } from './search';

describe('matchesSearch', () => {
  it('finds a name typed without its accents or capitals', () => {
    expect(matchesSearch('Développé épaules', 'developpe EP')).toBe(true);
    expect(matchesSearch('Mûre', 'mure')).toBe(true);
  });

  it('finds everything for an empty search', () => {
    expect(matchesSearch('Rameur', '  ')).toBe(true);
  });

  it('refuses a name that does not hold the search', () => {
    expect(matchesSearch('Rameur', 'tapis')).toBe(false);
  });

  it('finds the words in any order, each in any of the texts', () => {
    expect(matchesSearch(['Frites', 'Coop'], 'coop  frite')).toBe(true);
  });

  it('refuses a search with one word found nowhere', () => {
    expect(matchesSearch(['Frites', 'Coop'], 'frite migros')).toBe(false);
  });

  it('skips a missing text', () => {
    expect(matchesSearch([null, 'Coop'], 'coop')).toBe(true);
    expect(matchesSearch([null], 'coop')).toBe(false);
  });
});

describe('matchesFood', () => {
  const food = { name: 'Frites', brand: 'Coop' } as FoodItem;

  it('finds a food by words of its name and brand', () => {
    expect(matchesFood(food, 'frite coop')).toBe(true);
  });

  it('refuses a food whose brand does not match', () => {
    expect(matchesFood(food, 'frite migros')).toBe(false);
  });
});

describe('isSameName', () => {
  it('sees the same name whatever the case and accents', () => {
    expect(isSameName('Développé couché', ' developpe COUCHE ')).toBe(true);
  });

  it('tells two different names apart', () => {
    expect(isSameName('Développé couché', 'Développé incliné')).toBe(false);
  });
});
