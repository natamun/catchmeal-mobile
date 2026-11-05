import { describe, expect, it } from 'vitest';

import {
  estimateReachDate,
  recommendGoals,
  suggestGoalType,
  type GoalInput,
} from './goals';

const BASE: GoalInput = {
  weight: 80,
  bmr: 1700,
  expenditure: 2600,
  goalType: 'LOSE_FAT',
  pace: 0.5,
};

describe('recommendGoals', () => {
  it('keeps a deficit that matches the pace when losing fat', () => {
    // 0.5 % of 80 kg = 0.4 kg a week = 3080 kcal a week = 440 a day.
    const goals = recommendGoals(BASE);

    expect(goals.kcal).toBe(2160);
    expect(goals.weeklyChangeKg).toBeCloseTo(-0.4, 1);
    expect(goals.limitedByBmr).toBe(false);
  });

  it('gives more protein to lose fat than to lose weight', () => {
    expect(recommendGoals(BASE).protein).toBe(160);
    expect(recommendGoals({ ...BASE, goalType: 'LOSE_WEIGHT' }).protein).toBe(
      128,
    );
  });

  it('keeps the expenditure to maintain and adds a surplus to build', () => {
    expect(
      recommendGoals({ ...BASE, goalType: 'MAINTAIN', pace: 0 }).kcal,
    ).toBe(2600);
    // 0.25 % of 80 kg = 0.2 kg a week x 4800 / 7 = 137 kcal a day.
    const gain = recommendGoals({
      ...BASE,
      goalType: 'GAIN_MUSCLE',
      pace: 0.25,
    });
    expect(gain.kcal).toBe(2740);
    expect(gain.weeklyChangeKg).toBeCloseTo(0.2, 2);
  });

  it('never goes under the BMR, and says so', () => {
    const goals = recommendGoals({ ...BASE, goalType: 'LOSE_WEIGHT', pace: 3 });

    expect(goals.kcal).toBe(1700);
    expect(goals.limitedByBmr).toBe(true);
    // Only the deficit kept counts: 900 kcal a day is about 0.82 kg a week.
    expect(goals.weeklyChangeKg).toBeCloseTo(-0.82, 2);
  });

  it('keeps at least 0.8 g of fat per kg and puts the rest in carbs', () => {
    const goals = recommendGoals({ ...BASE, expenditure: 1800, bmr: 1500 });

    expect(goals.fat).toBe(64);
    expect(goals.carbs).toBe(
      Math.round((goals.kcal - goals.protein * 4 - goals.fat * 9) / 4),
    );
  });

  it('never gives negative carbs', () => {
    const goals = recommendGoals({
      ...BASE,
      weight: 150,
      bmr: 1200,
      expenditure: 1300,
    });

    expect(goals.carbs).toBe(0);
  });
});

describe('suggestGoalType', () => {
  it.each([
    [80, 72, 'LOSE_FAT'],
    [60, 66, 'GAIN_MUSCLE'],
    [80, 80.3, 'MAINTAIN'],
    [80, null, 'MAINTAIN'],
  ] as const)(
    '%s kg with a target of %s kg: %s',
    (weight, target, expected) => {
      expect(suggestGoalType(weight, target)).toBe(expected);
    },
  );
});

describe('estimateReachDate', () => {
  const FROM = new Date(2026, 10, 5);

  it('counts the weeks needed to reach the target', () => {
    expect(estimateReachDate(80, 78, -0.5, FROM)).toEqual(
      new Date(2026, 11, 3),
    );
  });

  it('gives no date when the change goes the other way or is zero', () => {
    expect(estimateReachDate(80, 78, 0.25, FROM)).toBeNull();
    expect(estimateReachDate(80, 78, 0, FROM)).toBeNull();
  });
});
