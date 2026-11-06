import { describe, expect, it } from 'vitest';

import { describeValues } from './format';

const NO_CARDIO = {
  durationMinutes: null,
  speedKmh: null,
  inclinePercent: null,
};

describe('describeValues', () => {
  it('writes the sets of a strength exercise', () => {
    expect(
      describeValues({
        kind: 'STRENGTH',
        sets: [
          { reps: 12, weightKg: 100 },
          { reps: 10, weightKg: 112.5 },
        ],
        ...NO_CARDIO,
      }),
    ).toBe('12×100 · 10×112,5 kg');
  });

  it('writes the duration, speed and slope of a treadmill', () => {
    expect(
      describeValues({
        kind: 'TREADMILL',
        sets: [],
        durationMinutes: 45,
        speedKmh: 4.5,
        inclinePercent: 10,
      }),
    ).toBe('45 min · 4,5 km/h · 10 %');
  });

  it('writes only what is known', () => {
    expect(
      describeValues({
        kind: 'CARDIO',
        sets: [],
        ...NO_CARDIO,
        durationMinutes: 15,
      }),
    ).toBe('15 min');
    expect(describeValues({ kind: 'STRENGTH', sets: [], ...NO_CARDIO })).toBe(
      '',
    );
  });
});
