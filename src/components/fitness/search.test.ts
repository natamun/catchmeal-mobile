import { describe, expect, it } from 'vitest';

import { isSameName, matchesSearch } from './search';

describe('matchesSearch', () => {
  it('finds a name typed without its accents or capitals', () => {
    expect(matchesSearch('Développé épaules', 'developpe EP')).toBe(true);
  });

  it('finds everything for an empty search', () => {
    expect(matchesSearch('Rameur', '  ')).toBe(true);
  });

  it('refuses a name that does not hold the search', () => {
    expect(matchesSearch('Rameur', 'tapis')).toBe(false);
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
