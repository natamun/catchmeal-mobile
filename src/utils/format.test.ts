import { describe, expect, it } from 'vitest';

import { formatSince } from './format';

const TODAY = new Date(2026, 10, 6, 9, 0);
const at = (month: number, day: number, hour = 12, year = 2026) =>
  new Date(year, month, day, hour).toISOString();

describe('formatSince', () => {
  it.each([
    ['earlier today', at(10, 6, 7), "Aujourd'hui"],
    ['yesterday late at night', at(10, 5, 23), 'Hier'],
    ['three days ago', at(10, 3), 'Il y a 3 jours'],
    ['six days ago', at(9, 31), 'Il y a 6 jours'],
  ])('counts calendar days for %s', (_, isoDate, expected) => {
    expect(formatSince(isoDate, TODAY)).toBe(expected);
  });

  it('shows the date from a week ago', () => {
    expect(formatSince(at(9, 30), TODAY)).toBe('Le 30 oct.');
  });

  it('adds the year when it is not this year', () => {
    expect(formatSince(at(11, 24, 12, 2025), TODAY)).toBe('Le 24 déc. 2025');
  });

  it('treats a moment later today as today', () => {
    expect(formatSince(at(10, 6, 20), TODAY)).toBe("Aujourd'hui");
  });
});
