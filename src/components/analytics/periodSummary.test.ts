import { beforeAll, describe, expect, it } from 'vitest';

import type { Workout } from '../fitness/types';
import { summarizePeriod, type SummaryProfile } from './periodSummary';
import type { DashboardDay } from './types';

beforeAll(() => {
  process.env.TZ = 'Europe/Zurich';
});

const EMPTY_DAY: Omit<DashboardDay, 'day'> = {
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
  goalProtein: null,
  objective: null,
};

const NO_PROFILE: SummaryProfile = {
  dailyCalorieGoal: null,
  dailyProteinGoal: null,
};

const eaten = (
  day: string,
  kcal: number,
  protein = 0,
  goals: Partial<DashboardDay> = {},
): DashboardDay => ({
  ...EMPTY_DAY,
  day,
  totalKcal: kcal,
  totalProtein: protein,
  ...goals,
});

const weighed = (day: string, weight: number): DashboardDay => ({
  ...EMPTY_DAY,
  day,
  weight,
});

const session = (performedOn: string): Workout => ({
  id: 1,
  performedOn,
  items: [],
});

/** Weigh-ins every 7 days from 2026-10-01, losing `perWeek` kg each week. */
const weighIns = (count: number, start: number, perWeek: number) =>
  Array.from({ length: count }, (_, index) =>
    weighed(
      `2026-10-${String(1 + index * 7).padStart(2, '0')}`,
      start + perWeek * index,
    ),
  );

describe('summarizePeriod', () => {
  it('counts the days of the period and the logged ones', () => {
    const summary = summarizePeriod(
      [eaten('2026-11-02', 2000), weighed('2026-11-03', 80)],
      [],
      '2026-11-01',
      '2026-11-07',
      NO_PROFILE,
    );

    expect(summary.periodDays).toBe(7);
    expect(summary.loggedDays).toBe(1);
  });

  it('leaves today out of the averages, its day not over', () => {
    const summary = summarizePeriod(
      [eaten('2026-11-10', 2000), eaten('2026-11-11', 600)],
      [],
      '2026-11-05',
      '2026-11-11',
      NO_PROFILE,
      new Date(2026, 10, 11, 12),
    );

    expect(summary.kcal?.average).toBe(2000);
    expect(summary.loggedDays).toBe(1);
    expect(summary.countableDays).toBe(6);
  });

  it('gives no calories nor protein without a logged meal', () => {
    const summary = summarizePeriod(
      [weighed('2026-11-03', 80)],
      [],
      '2026-11-01',
      '2026-11-07',
      NO_PROFILE,
    );

    expect(summary.kcal).toBeNull();
    expect(summary.protein).toBeNull();
  });

  it('averages the calories and the goal of each logged day', () => {
    const summary = summarizePeriod(
      [
        eaten('2026-11-02', 2000, 0, { goalKcal: 2000 }),
        eaten('2026-11-03', 2500, 0, { goalKcal: 2200 }),
      ],
      [],
      '2026-11-01',
      '2026-11-07',
      NO_PROFILE,
    );

    expect(summary.kcal).toEqual({ average: 2250, goal: 2100 });
  });

  it("uses the profile's goals for a day without its own", () => {
    const summary = summarizePeriod(
      [eaten('2026-11-02', 2000, 150)],
      [],
      '2026-11-01',
      '2026-11-07',
      { ...NO_PROFILE, dailyCalorieGoal: 1900, dailyProteinGoal: 160 },
    );

    expect(summary.kcal?.goal).toBe(1900);
    expect(summary.protein).toEqual({ average: 150, goal: 160 });
  });

  it('compares the weekend days with the weekdays', () => {
    const summary = summarizePeriod(
      [
        eaten('2026-11-02', 2000),
        eaten('2026-11-03', 2000),
        eaten('2026-11-04', 2000),
        eaten('2026-11-05', 2000),
        eaten('2026-11-07', 2500),
        eaten('2026-11-08', 2300),
      ],
      [],
      '2026-11-02',
      '2026-11-08',
      NO_PROFILE,
    );

    expect(summary.weekSplit).toEqual({ week: 2000, weekend: 2400 });
  });

  it('does not compare the weekend with too few days of either', () => {
    const summary = summarizePeriod(
      [
        eaten('2026-11-02', 2000),
        eaten('2026-11-03', 2000),
        eaten('2026-11-04', 2000),
        eaten('2026-11-05', 2000),
        eaten('2026-11-07', 2500),
      ],
      [],
      '2026-11-02',
      '2026-11-08',
      NO_PROFILE,
    );

    expect(summary.weekSplit).toBeNull();
  });

  it('measures the weight pace on all the weigh-ins', () => {
    const summary = summarizePeriod(
      weighIns(4, 80, -0.2),
      [],
      '2026-10-01',
      '2026-10-31',
      NO_PROFILE,
    );

    expect(summary.weight).toMatchObject({ first: 80, last: 79.4 });
    expect(summary.weight?.perWeek).toBeCloseTo(-0.2);
  });

  it('gives no pace with weigh-ins over less than two weeks', () => {
    const summary = summarizePeriod(
      weighIns(2, 80, -0.5),
      [],
      '2026-10-01',
      '2026-10-31',
      NO_PROFILE,
    );

    expect(summary.weight).toMatchObject({
      first: 80,
      last: 79.5,
      perWeek: null,
    });
  });

  it('gives the sessions per week, not for a period under a week', () => {
    const workouts = [session('2026-11-02'), session('2026-11-04')];

    expect(
      summarizePeriod([], workouts, '2026-10-26', '2026-11-08', NO_PROFILE)
        .sessions,
    ).toEqual({ count: 2, perWeek: 1 });
    expect(
      summarizePeriod([], workouts, '2026-11-02', '2026-11-04', NO_PROFILE)
        .sessions,
    ).toEqual({ count: 2, perWeek: null });
  });
});
