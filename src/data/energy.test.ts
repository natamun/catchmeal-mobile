import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { toDateKey } from '../utils/dateKey';
import {
  estimateExpenditure,
  measureExpenditure,
  measureHoldsGoalStart,
  type WeighIn,
} from './energy';
import { createMeal } from './meals';
import { logWeight } from './weights';

/** Weigh-ins going down by 0.5 kg a week, from 80 kg, every 3 days. */
const losingHalfAKiloAWeek = (count: number): WeighIn[] =>
  Array.from({ length: count }, (_, i) => ({
    day: i * 3,
    weight: 80 - (0.5 / 7) * i * 3,
  }));

describe('estimateExpenditure', () => {
  it('adds the energy of the weight lost to what was eaten', () => {
    // 0.5 kg a week x 7700 / 7 = 550 kcal a day on top of 2000.
    const intakes = Array.from({ length: 28 }, () => 2000);

    expect(estimateExpenditure(intakes, losingHalfAKiloAWeek(10))).toBe(2550);
  });

  it('removes the energy of the weight gained', () => {
    const gaining = losingHalfAKiloAWeek(10).map(({ day, weight }) => ({
      day,
      weight: 160 - weight,
    }));

    expect(
      estimateExpenditure(
        Array.from({ length: 20 }, () => 3000),
        gaining,
      ),
    ).toBe(2450);
  });

  it.each<[string, number, WeighIn[]]>([
    ['fewer than 14 logged days', 13, losingHalfAKiloAWeek(10)],
    ['fewer than 3 weigh-ins', 28, losingHalfAKiloAWeek(2)],
    [
      'weigh-ins over less than 2 weeks',
      28,
      [
        { day: 0, weight: 80 },
        { day: 5, weight: 79.8 },
        { day: 10, weight: 79.5 },
      ],
    ],
  ])('gives nothing with %s', (_, loggedDays, weighIns) => {
    expect(
      estimateExpenditure(
        Array.from({ length: loggedDays }, () => 2000),
        weighIns,
      ),
    ).toBeNull();
  });
});

describe('measureExpenditure', () => {
  const TODAY = new Date(2026, 10, 30, 12);
  let db: Database;

  beforeAll(() => {
    process.env.TZ = 'Europe/Zurich';
  });

  beforeEach(async () => {
    db = openMemoryDatabase();
    await migrate(db);
  });

  const dayBefore = (days: number, hour = 12) =>
    new Date(
      TODAY.getFullYear(),
      TODAY.getMonth(),
      TODAY.getDate() - days,
      hour,
    );

  const logDay = (days: number, kcal: number) =>
    createMeal(db, {
      typeMeal: 'LUNCH',
      loggedAt: toDateKey(dayBefore(days)),
      items: [{ quantity: 1, kcal, protein: 0, carbs: 0, fat: 0 }],
    });

  const weighIn = (days: number, weight: number) =>
    logWeight(
      db,
      {
        weight,
        bodyFat: null,
        fatFreeMass: null,
        bodyWater: null,
        muscleMass: null,
      },
      dayBefore(days, 7),
    );

  it('measures the last four weeks of the journal', async () => {
    for (let days = 1; days <= 28; days += 1) await logDay(days, 2000);
    for (let days = 28; days >= 1; days -= 3) {
      await weighIn(
        days,
        Math.round((80 - (0.5 / 7) * (28 - days)) * 100) / 100,
      );
    }

    expect(await measureExpenditure(db, TODAY)).toEqual({
      kcal: 2550,
      loggedDays: 28,
      weighIns: 10,
    });
  });

  it('leaves today out, and the days before the four weeks', async () => {
    for (let days = 1; days <= 28; days += 1) await logDay(days, 2000);
    await logDay(0, 9000);
    await logDay(35, 9000);
    for (let days = 28; days >= 1; days -= 3) await weighIn(days, 80);

    expect((await measureExpenditure(db, TODAY))?.kcal).toBe(2000);
  });

  it('gives nothing without enough journal', async () => {
    for (let days = 1; days <= 10; days += 1) await logDay(days, 2000);
    for (let days = 28; days >= 1; days -= 3) await weighIn(days, 80);

    expect(await measureExpenditure(db, TODAY)).toBeNull();
  });
});

describe('measureHoldsGoalStart', () => {
  const today = new Date(2026, 10, 8, 12);
  const daysAgo = (days: number) => new Date(2026, 10, 8 - days, 8);

  it('flags a measure that holds the first two weeks of the goal', () => {
    expect(measureHoldsGoalStart(daysAgo(20), today)).toBe(true);
    expect(measureHoldsGoalStart(daysAgo(41), today)).toBe(true);
  });

  it('trusts a measure that starts once the two weeks are over', () => {
    expect(measureHoldsGoalStart(daysAgo(43), today)).toBe(false);
  });
});
