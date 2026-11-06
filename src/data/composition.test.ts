import { describe, expect, it } from 'vitest';

import {
  compositionAlert,
  compositionChange,
  effectiveTargetWeight,
  fatFreeMassOf,
  latestComposition,
  targetWeightFor,
  type CompositionEntry,
} from './composition';

const TODAY = new Date('2026-11-06T12:00:00.000Z');

/** A weigh-in `daysAgo` days before TODAY, with its fat-free mass. */
const entry = (
  daysAgo: number,
  weight: number,
  fatFreeMass: number | null,
): CompositionEntry => ({
  weight,
  bodyFat: null,
  fatFreeMass,
  loggedAt: new Date(
    TODAY.getTime() - daysAgo * 24 * 60 * 60 * 1000,
  ).toISOString(),
});

/** One weigh-in a week, from `weeks` weeks ago to today. */
const weekly = (weeks: number, at: (week: number) => [number, number]) =>
  Array.from({ length: weeks + 1 }, (_, week) =>
    entry((weeks - week) * 7, ...at(week)),
  );

describe('fatFreeMassOf', () => {
  it('takes the measured value, else deduces it from the body fat', () => {
    expect(fatFreeMassOf({ weight: 80, bodyFat: 25, fatFreeMass: 62 })).toBe(
      62,
    );
    expect(fatFreeMassOf({ weight: 80, bodyFat: 25, fatFreeMass: null })).toBe(
      60,
    );
    expect(
      fatFreeMassOf({ weight: 80, bodyFat: null, fatFreeMass: null }),
    ).toBeNull();
  });
});

describe('latestComposition', () => {
  it('gives the latest weigh-in that tells the fat-free mass', () => {
    const measured = entry(3, 80, 60);

    expect(
      latestComposition([entry(10, 81, 61), entry(1, 79.5, null), measured]),
    ).toBe(measured);
    expect(latestComposition([entry(1, 79.5, null)])).toBeNull();
  });
});

describe('effectiveTargetWeight', () => {
  it('deduces the weight from the target body fat and the fat-free mass', () => {
    // 60 kg of fat-free mass at 15 % of fat: 60 / 0.85.
    expect(targetWeightFor(60, 15)).toBe(70.6);
    expect(
      effectiveTargetWeight({ targetWeight: 90, targetBodyFat: 15 }, 60),
    ).toBe(70.6);
  });

  it('keeps the target weight without a target body fat or a fat-free mass', () => {
    expect(
      effectiveTargetWeight({ targetWeight: 72, targetBodyFat: null }, 60),
    ).toBe(72);
    expect(
      effectiveTargetWeight({ targetWeight: 72, targetBodyFat: 15 }, null),
    ).toBe(72);
  });
});

describe('compositionChange', () => {
  it('reads the fat and fat-free mass moved on their trend', () => {
    // 0.5 kg of fat lost a week, the fat-free mass kept, one noisy weigh-in.
    const entries = weekly(4, (week) => [80 - week * 0.5, 60]);
    entries[2] = entry(14, 80, 60.6);

    const change = compositionChange(entries)!;

    expect(change.fatKg).toBeCloseTo(-2, 0);
    expect(change.leanKg).toBeCloseTo(0, 0);
    expect(change).toMatchObject({ days: 28, weighIns: 5 });
  });

  it('reads only the weigh-ins of the period that tell the composition', () => {
    const entries = [
      ...weekly(6, (week) => [80 - week * 0.5, 60]),
      entry(2, 70, null),
    ];

    const change = compositionChange(entries, {
      from: new Date(TODAY.getTime() - 22 * 24 * 60 * 60 * 1000),
    })!;

    expect(change).toMatchObject({ weighIns: 4, days: 21 });
    expect(change.fatKg).toBeCloseTo(-1.5);
  });

  it.each<[string, CompositionEntry[]]>([
    ['two weigh-ins', [entry(20, 80, 60), entry(0, 79, 60)]],
    [
      'three weigh-ins within 13 days',
      [entry(13, 80, 60), entry(6, 79.5, 60), entry(0, 79, 60)],
    ],
    [
      'weigh-ins without the composition',
      [entry(20, 80, null), entry(10, 79.5, null), entry(0, 79, null)],
    ],
  ])('gives nothing from %s', (_, entries) => {
    expect(compositionChange(entries)).toBeNull();
  });
});

describe('compositionAlert', () => {
  const options = {
    goalType: 'LOSE_FAT' as const,
    goalStart: null,
    warnLeanLoss: true,
  };

  it('warns while losing when the fat-free mass makes over a third of the loss', () => {
    // 4 kg lost in 6 weeks, 2 of them fat-free mass.
    const entries = weekly(6, (week) => [
      80 - (week * 4) / 6,
      60 - (week * 2) / 6,
    ]);

    expect(compositionAlert(entries, options, TODAY)).toBe('LEAN_LOSS');
    expect(
      compositionAlert(entries, { ...options, goalType: 'LOSE_WEIGHT' }, TODAY),
    ).toBe('LEAN_LOSS');
  });

  it('stays quiet when the loss is mostly fat, or turned off', () => {
    const mostlyFat = weekly(6, (week) => [80 - week * 0.5, 60 - week * 0.1]);
    const leanLost = weekly(6, (week) => [80 - week * 0.5, 60 - week * 0.3]);

    expect(compositionAlert(mostlyFat, options, TODAY)).toBeNull();
    expect(
      compositionAlert(leanLost, { ...options, warnLeanLoss: false }, TODAY),
    ).toBeNull();
  });

  it('warns while building when the fat rises faster than the fat-free mass', () => {
    // 2 kg gained in 6 weeks, 0.6 of them fat-free mass.
    const entries = weekly(6, (week) => [
      70 + (week * 2) / 6,
      60 + (week * 0.6) / 6,
    ]);
    const lean = weekly(6, (week) => [70 + (week * 2) / 6, 60 + week * 0.25]);

    expect(
      compositionAlert(
        entries,
        { ...options, goalType: 'GAIN_MUSCLE', warnLeanLoss: false },
        TODAY,
      ),
    ).toBe('FAT_GAIN');
    expect(
      compositionAlert(lean, { ...options, goalType: 'GAIN_MUSCLE' }, TODAY),
    ).toBeNull();
  });

  it('waits for four weeks of the goal before telling anything', () => {
    const entries = weekly(6, (week) => [80 - week * 0.7, 60 - week * 0.35]);

    expect(
      compositionAlert(
        entries,
        {
          ...options,
          goalStart: new Date(TODAY.getTime() - 21 * 24 * 60 * 60 * 1000),
        },
        TODAY,
      ),
    ).toBeNull();
    expect(
      compositionAlert(entries, { ...options, goalType: 'MAINTAIN' }, TODAY),
    ).toBeNull();
  });
});
