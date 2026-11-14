import { beforeAll, describe, expect, it } from 'vitest';

import { buildDataGraph, grainForWidth, groupDays } from './buildDataGraph';
import type { DashboardDay } from './types';

beforeAll(() => {
  process.env.TZ = 'Europe/Zurich';
});

const eaten = (day: string, kcal: number, goalKcal: number | null = null) =>
  ({
    day,
    totalKcal: kcal,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    weight: null,
    bodyFat: null,
    fatFreeMass: null,
    bodyWater: null,
    muscleMass: null,
    goalKcal,
    goalProtein: null,
    objective: null,
  }) satisfies DashboardDay;

describe('groupDays', () => {
  it('gives every calendar day its own group by day', () => {
    expect(groupDays('2026-11-09', '2026-11-11', 'day')).toEqual([
      ['2026-11-09'],
      ['2026-11-10'],
      ['2026-11-11'],
    ]);
  });

  it('cuts weeks Monday to Sunday, the ends cut short by the period', () => {
    const weeks = groupDays('2026-10-29', '2026-11-10', 'week');

    expect(weeks.map((week) => [week[0], week.at(-1)])).toEqual([
      ['2026-10-29', '2026-11-01'],
      ['2026-11-02', '2026-11-08'],
      ['2026-11-09', '2026-11-10'],
    ]);
  });

  it('pairs the weeks from the first one', () => {
    const pairs = groupDays('2026-10-26', '2026-11-15', 'biWeek');

    expect(pairs.map((pair) => [pair[0], pair.at(-1)])).toEqual([
      ['2026-10-26', '2026-11-08'],
      ['2026-11-09', '2026-11-15'],
    ]);
  });
});

describe('buildDataGraph', () => {
  it('averages a week over its logged days only, not its forgotten ones', () => {
    const [week] = buildDataGraph(
      [eaten('2026-11-02', 2000), eaten('2026-11-03', 2400)],
      '2026-11-02',
      '2026-11-08',
      'week',
    );

    expect(week).toMatchObject({
      from: '02/11',
      date: '08/11',
      loggedDays: 2,
      kcal: 2200,
    });
  });

  it('leaves today out of a week, its day not over', () => {
    const [week] = buildDataGraph(
      [eaten('2026-11-09', 2000), eaten('2026-11-10', 800)],
      '2026-11-09',
      '2026-11-15',
      'week',
      '2026-11-10',
    );

    expect(week).toMatchObject({
      from: '09/11',
      date: '09/11',
      loggedDays: 1,
      kcal: 2000,
      inProgress: false,
    });
  });

  it('keeps today alone in its bar, marked in progress', () => {
    const points = buildDataGraph(
      [eaten('2026-11-09', 2000), eaten('2026-11-10', 800)],
      '2026-11-09',
      '2026-11-10',
      'day',
      '2026-11-10',
    );

    expect(points.map(({ kcal, inProgress }) => [kcal, inProgress])).toEqual([
      [2000, false],
      [800, true],
    ]);
  });

  it('keeps a forgotten day in its place, empty', () => {
    const points = buildDataGraph(
      [eaten('2026-11-09', 2000), eaten('2026-11-11', 1800)],
      '2026-11-09',
      '2026-11-11',
      'day',
    );

    expect(
      points.map(({ from, kcal, loggedDays }) => [from, kcal, loggedDays]),
    ).toEqual([
      ['09/11', 2000, 1],
      ['10/11', 0, 0],
      ['11/11', 1800, 1],
    ]);
  });
});

describe('grainForWidth', () => {
  it('shows days while each bar keeps 24 px, then weeks, then two weeks', () => {
    // 240 px hold 10 bars.
    expect(grainForWidth(240, '2026-11-02', '2026-11-11')).toBe('day');
    expect(grainForWidth(240, '2026-11-01', '2026-11-11')).toBe('week');
    expect(grainForWidth(240, '2026-08-01', '2026-11-11')).toBe('biWeek');
  });

  it('starts at weeks when days are not allowed', () => {
    expect(grainForWidth(240, '2026-11-09', '2026-11-11', false)).toBe('week');
  });
});
