import { describe, expect, it } from 'vitest';

import { listMeals } from '../data/meals';
import { listWeights } from '../data/weights';
import { listWorkouts } from '../data/workouts';
import { migrate } from '../db/migrations';
import { toDateKey } from '../utils/dateKey';
import { DEMO_DAYS, seedDemo } from './demoSeed';
import { openMemoryDatabase } from './nodeDatabase';

describe('seedDemo', () => {
  it('fills the last 90 days up to the given day, following every rule', async () => {
    const db = openMemoryDatabase();
    await migrate(db);
    const today = new Date(2027, 0, 20, 15);

    await seedDemo(db, today);

    const first = toDateKey(new Date(2027, 0, 20 - DEMO_DAYS + 1));
    const days = (await listMeals(db, { logged: true })).map(
      (meal) => meal.loggedAt ?? '',
    );
    expect(days).toContain('2027-01-20');
    expect(days.every((day) => day >= first && day <= '2027-01-20')).toBe(true);
    expect(await listMeals(db, { logged: false })).toHaveLength(3);

    const weighIns = (await listWeights(db)).map((entry) => entry.loggedAt);
    expect(weighIns.at(-1)?.slice(0, 10)).toBe(
      new Date(2027, 0, 20 - DEMO_DAYS + 1, 7).toISOString().slice(0, 10),
    );
    expect((await listWorkouts(db)).length).toBeGreaterThan(30);
  });
});
