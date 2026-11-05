import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { DataError } from './errors';
import { createMeal } from './meals';
import { getDashboard } from './stats';

let db: Database;

beforeAll(() => {
  // Days are local: the tests run on Swiss time, like the phone.
  process.env.TZ = 'Europe/Zurich';
});

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
});

const quickAdd = (kcal: number, protein = 0, carbs = 0, fat = 0) => ({
  quantity: 1,
  kcal,
  protein,
  carbs,
  fat,
});

const logMeal = (day: string, kcal: number, protein = 0, carbs = 0, fat = 0) =>
  createMeal(db, {
    typeMeal: 'LUNCH',
    loggedAt: day,
    items: [quickAdd(kcal, protein, carbs, fat)],
  });

const weighIn = (at: string, weight: number, bodyFat: number | null = null) =>
  db.run(
    'INSERT INTO weight_log (weight, body_fat, logged_at) VALUES (?, ?, ?)',
    [weight, bodyFat, at],
  );

const setGoal = (at: string, kcal: number, objective: string | null = null) =>
  db.run(
    'INSERT INTO goal_setting (daily_calories, objective, start_date) VALUES (?, ?, ?)',
    [kcal, objective, at],
  );

const EMPTY_DAY = {
  totalKcal: null,
  totalProtein: null,
  totalCarbs: null,
  totalFat: null,
  weight: null,
  bodyFat: null,
  fatFreeMass: null,
  bodyWater: null,
  muscleMass: null,
  goalKcal: null,
  objective: null,
};

describe('getDashboard', () => {
  it('returns no day when nothing was logged', async () => {
    expect(await getDashboard(db, '2026-11-01', '2026-11-07')).toEqual([]);
  });

  it('adds up the meals of each day and rounds the totals', async () => {
    await logMeal('2026-11-02', 500.4, 20.6, 60, 10);
    await logMeal('2026-11-02', 300.3, 10, 40.2, 5.5);
    await logMeal('2026-11-04', 1800);

    expect(await getDashboard(db, '2026-11-01', '2026-11-07')).toEqual([
      {
        ...EMPTY_DAY,
        day: '2026-11-02',
        totalKcal: 801,
        totalProtein: 31,
        totalCarbs: 100,
        totalFat: 16,
      },
      {
        ...EMPTY_DAY,
        day: '2026-11-04',
        totalKcal: 1800,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
      },
    ]);
  });

  it('keeps only the days of the period, both ends included', async () => {
    await logMeal('2026-10-31', 100);
    await logMeal('2026-11-01', 200);
    await logMeal('2026-11-07', 300);
    await logMeal('2026-11-08', 400);

    const days = await getDashboard(db, '2026-11-01', '2026-11-07');

    expect(days.map(({ day }) => day)).toEqual(['2026-11-01', '2026-11-07']);
  });

  it('takes the last weigh-in of a day, without carrying it to other days', async () => {
    await weighIn('2026-11-02T06:00:00.000Z', 73, 19);
    await weighIn('2026-11-02T18:00:00.000Z', 72.5);
    await logMeal('2026-11-03', 2000);

    const days = await getDashboard(db, '2026-11-01', '2026-11-07');

    expect(days).toEqual([
      { ...EMPTY_DAY, day: '2026-11-02', weight: 72.5, bodyFat: null },
      expect.objectContaining({ day: '2026-11-03', weight: null }),
    ]);
  });

  it('counts a weigh-in made just after midnight for the new day', async () => {
    // 23:30 UTC on the 4th is 00:30 on the 5th in Switzerland.
    await weighIn('2026-11-04T23:30:00.000Z', 71);

    const days = await getDashboard(db, '2026-11-05', '2026-11-05');

    expect(days).toEqual([{ ...EMPTY_DAY, day: '2026-11-05', weight: 71 }]);
  });

  it('applies the goal set before the period to every day', async () => {
    await setGoal('2026-10-20T10:00:00.000Z', 2000, 'lose');
    await logMeal('2026-11-02', 1500);
    await logMeal('2026-11-03', 1700);

    const days = await getDashboard(db, '2026-11-01', '2026-11-07');

    expect(
      days.map(({ goalKcal, objective }) => [goalKcal, objective]),
    ).toEqual([
      [2000, 'lose'],
      [2000, 'lose'],
    ]);
  });

  it('switches to a new goal from the day it was set', async () => {
    await setGoal('2026-10-20T10:00:00.000Z', 2000);
    await setGoal('2026-11-03T20:00:00.000Z', 1800, 'lose');
    await logMeal('2026-11-02', 1500);
    await logMeal('2026-11-04', 1600);

    const days = await getDashboard(db, '2026-11-01', '2026-11-07');

    expect(days.map(({ day, goalKcal }) => [day, goalKcal])).toEqual([
      ['2026-11-02', 2000],
      ['2026-11-03', 1800],
      ['2026-11-04', 1800],
    ]);
  });

  it('refuses a period written in another format', async () => {
    await expect(getDashboard(db, '01.11.2026', '2026-11-07')).rejects.toThrow(
      DataError,
    );
  });
});
