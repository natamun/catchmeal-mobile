import { beforeEach, describe, expect, it } from 'vitest';

import type { UpdateProfileInput } from '../components/profile/api';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { DataError } from './errors';
import { getGoalStart, getProfile, updateProfile } from './profile';
import { logWeight } from './weights';

let db: Database;

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
});

const NOW = new Date('2026-11-05T08:00:00.000Z');

const goals = () =>
  db.query<{ daily_calories: number; objective: string | null }>(
    'SELECT daily_calories, objective FROM goal_setting ORDER BY id',
  );

const weighIn = (weight: number, bodyFat: number | null = null) =>
  logWeight(db, {
    weight,
    bodyFat,
    fatFreeMass: null,
    bodyWater: null,
    muscleMass: null,
  });

describe('getProfile', () => {
  it('starts empty', async () => {
    expect(await getProfile(db)).toEqual({
      height: null,
      targetWeight: null,
      targetBodyFat: null,
      dailyCalorieGoal: null,
      dailyProteinGoal: null,
      dailyCarbsGoal: null,
      dailyFatGoal: null,
      gender: null,
      birthDate: null,
      activityLevel: null,
      goalType: null,
      goalPace: null,
      theme: null,
      leanLossAlert: true,
    });
  });
});

describe('updateProfile', () => {
  it('saves the fields given and keeps the others', async () => {
    await updateProfile(db, { height: 178.5, gender: 'MALE' });

    const profile = await updateProfile(db, {
      birthDate: '1990-04-12',
      activityLevel: 'MODERATELY_ACTIVE',
      goalType: 'LOSE_FAT',
    });

    expect(profile).toMatchObject({
      height: 178.5,
      gender: 'MALE',
      birthDate: '1990-04-12',
      activityLevel: 'MODERATELY_ACTIVE',
      goalType: 'LOSE_FAT',
    });
    expect(await getProfile(db)).toEqual(profile);
  });

  it('saves the color theme', async () => {
    expect((await updateProfile(db, { theme: 'nord' })).theme).toBe('nord');
  });

  it('saves the target body fat, the pace and turns the lean mass alert off', async () => {
    const profile = await updateProfile(db, {
      targetBodyFat: 14,
      goalPace: 0.25,
      leanLossAlert: false,
    });

    expect(profile).toMatchObject({
      targetBodyFat: 14,
      goalPace: 0.25,
      leanLossAlert: false,
    });
    expect(await getProfile(db)).toEqual(profile);
  });

  it('clears a field given null', async () => {
    await updateProfile(db, { height: 178, targetWeight: 70 });

    const profile = await updateProfile(db, { targetWeight: null });

    expect(profile).toMatchObject({ height: 178, targetWeight: null });
  });

  it.each<[string, UpdateProfileInput]>([
    ['a zero height', { height: 0 }],
    ['a height over 300 cm', { height: 301 }],
    ['a height with 3 decimals', { height: 178.123 }],
    ['a target weight over 500 kg', { targetWeight: 501 }],
    ['a target body fat of 2 %', { targetBodyFat: 2 }],
    ['a negative pace', { goalPace: -0.5 }],
    ['a pace over 5 % a week', { goalPace: 5.5 }],
    ['a target body fat over 60 %', { targetBodyFat: 61 }],
    ['a target body fat with decimals', { targetBodyFat: 14.5 }],
    [
      'an alert neither on nor off',
      { leanLossAlert: 'yes' as unknown as boolean },
    ],
    ['a calorie goal with decimals', { dailyCalorieGoal: 2200.5 }],
    ['a calorie goal over 10000', { dailyCalorieGoal: 10001 }],
    ['a zero calorie goal', { dailyCalorieGoal: 0 }],
    ['a protein goal over 1000 g', { dailyProteinGoal: 1001 }],
    ['a carbs goal over 2000 g', { dailyCarbsGoal: 2001 }],
    ['a fat goal over 1000 g', { dailyFatGoal: 1001 }],
    ['an unknown gender', { gender: 'X' }],
    ['an unknown activity level', { activityLevel: 'LAZY' }],
    ['an unknown goal type', { goalType: 'BULK' }],
    ['an unknown theme', { theme: 'rose' }],
    ['a birth date in another format', { birthDate: '12.04.1990' }],
    ['a birth date that does not exist', { birthDate: '1990-02-30' }],
  ])('refuses %s and saves nothing', async (_, input) => {
    await expect(updateProfile(db, { height: 180, ...input })).rejects.toThrow(
      DataError,
    );
    expect((await getProfile(db)).height).toBeNull();
  });
});

describe('goal history', () => {
  it('records a new calorie goal with the macros of that moment', async () => {
    await updateProfile(
      db,
      { dailyCalorieGoal: 2200, dailyProteinGoal: 150 },
      NOW,
    );

    expect(
      await db.query(
        'SELECT daily_calories, daily_protein, daily_carbs, start_date FROM goal_setting',
      ),
    ).toEqual([
      {
        daily_calories: 2200,
        daily_protein: 150,
        daily_carbs: null,
        start_date: NOW.toISOString(),
      },
    ]);
  });

  it('marks the goal as losing weight when the target is below the latest weigh-in', async () => {
    await weighIn(80);
    await weighIn(78);

    await updateProfile(db, { targetWeight: 72, dailyCalorieGoal: 1900 });

    expect(await goals()).toEqual([
      { daily_calories: 1900, objective: 'lose' },
    ]);
  });

  it('marks the goal as gaining weight when the target is above', async () => {
    await weighIn(60);

    await updateProfile(db, { targetWeight: 65, dailyCalorieGoal: 2600 });

    expect(await goals()).toEqual([
      { daily_calories: 2600, objective: 'gain' },
    ]);
  });

  it('sets the objective from the target body fat when the scale tells the fat-free mass', async () => {
    // 25 % of 80 kg is fat: 60 kg of fat-free mass, 70.6 kg at 15 %.
    await weighIn(80, 25);

    await updateProfile(db, {
      targetWeight: 90,
      targetBodyFat: 15,
      dailyCalorieGoal: 2000,
    });

    expect(await goals()).toEqual([
      { daily_calories: 2000, objective: 'lose' },
    ]);
  });

  it('records no objective without a weigh-in or a target', async () => {
    await updateProfile(db, { dailyCalorieGoal: 2000 });

    expect(await goals()).toEqual([{ daily_calories: 2000, objective: null }]);
  });

  it('adds an entry only when the calorie goal changes', async () => {
    await updateProfile(db, { dailyCalorieGoal: 2000 });
    await updateProfile(db, { dailyCalorieGoal: 2000, height: 170 });
    await updateProfile(db, { dailyProteinGoal: 120 });
    await updateProfile(db, { dailyCalorieGoal: 2100 });

    expect((await goals()).map(({ daily_calories }) => daily_calories)).toEqual(
      [2000, 2100],
    );
  });

  it('records nothing when the calorie goal is cleared', async () => {
    await updateProfile(db, { dailyCalorieGoal: 2000 });
    await updateProfile(db, { dailyCalorieGoal: null });

    expect(await goals()).toHaveLength(1);
  });
});

describe('getGoalStart', () => {
  const change = (objective: string | null, day: string) =>
    db.run(
      'INSERT INTO goal_setting (daily_calories, objective, start_date) VALUES (2000, ?, ?)',
      [objective, `${day}T08:00:00.000Z`],
    );

  it('gives the first change since the objective last turned', async () => {
    await change('lose', '2026-09-01');
    await change('gain', '2026-10-01');
    await change('gain', '2026-10-15');
    await change('gain', '2026-11-01');

    expect(await getGoalStart(db)).toBe('2026-10-01T08:00:00.000Z');
  });

  it('gives nothing before any goal', async () => {
    expect(await getGoalStart(db)).toBeNull();
  });
});
