import { describe, expect, it } from 'vitest';

import { describeCardioSet, describeValues } from './format';

const cardio = (
  durationMinutes: number,
  speedKmh: number | null = null,
  inclinePercent: number | null = null,
  resistance: number | null = null,
) => ({ durationMinutes, speedKmh, inclinePercent, resistance });

describe('describeCardioSet', () => {
  it('writes a treadmill set, its slope only when it climbs', () => {
    expect(describeCardioSet(cardio(10, 3.5, 8))).toBe(
      '10 min à 3,5 km/h, 8 %',
    );
    expect(describeCardioSet(cardio(20, 5, 0))).toBe('20 min à 5 km/h');
  });

  it('writes another machine with its resistance when known', () => {
    expect(describeCardioSet(cardio(15, null, null, 8))).toBe(
      '15 min, résistance 8',
    );
    expect(describeCardioSet(cardio(15))).toBe('15 min');
  });
});

describe('describeValues', () => {
  it('writes the sets of a strength exercise', () => {
    expect(
      describeValues({
        kind: 'STRENGTH',
        sets: [
          { reps: 12, weightKg: 100 },
          { reps: 10, weightKg: 112.5 },
        ],
        cardioSets: [],
      }),
    ).toBe('12×100 · 10×112,5 kg');
  });

  it('writes the sets of a treadmill, one after the other', () => {
    expect(
      describeValues({
        kind: 'TREADMILL',
        sets: [],
        cardioSets: [cardio(10, 3.5, 8), cardio(35, 4, 10)],
      }),
    ).toBe('10 min à 3,5 km/h, 8 % · 35 min à 4 km/h, 10 %');
  });

  it('writes nothing for an exercise without sets', () => {
    expect(describeValues({ kind: 'STRENGTH', sets: [], cardioSets: [] })).toBe(
      '',
    );
  });
});
