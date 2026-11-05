import { beforeEach, describe, expect, it } from 'vitest';

import type { LogWeightInput } from '../components/profile/api';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { DataError } from './errors';
import { deleteWeight, listWeights, logWeight, updateWeight } from './weights';

let db: Database;

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
});

const WEIGH_IN: LogWeightInput = {
  weight: 72.45,
  bodyFat: 18.2,
  fatFreeMass: 59.3,
  bodyWater: 55,
  muscleMass: 33.1,
};

describe('logWeight', () => {
  it('saves the weigh-in dated now', async () => {
    const now = new Date('2026-11-05T07:30:00.000Z');

    const entry = await logWeight(db, WEIGH_IN, now);

    expect(entry).toEqual({
      ...WEIGH_IN,
      id: entry.id,
      loggedAt: now.toISOString(),
    });
  });

  it('accepts a weigh-in with only the weight', async () => {
    const entry = await logWeight(db, {
      weight: 72,
      bodyFat: null,
      fatFreeMass: null,
      bodyWater: null,
      muscleMass: null,
    });

    expect(entry.bodyFat).toBeNull();
  });

  it.each<[string, Partial<LogWeightInput>]>([
    ['a zero weight', { weight: 0 }],
    ['a weight over 500 kg', { weight: 501 }],
    ['a weight with 3 decimals', { weight: 72.456 }],
    ['a body fat over 100 %', { bodyFat: 101 }],
    ['a zero body water', { bodyWater: 0 }],
    ['a body water over 100 %', { bodyWater: 100.5 }],
    ['a fat-free mass over 500 kg', { fatFreeMass: 501 }],
    ['a negative muscle mass', { muscleMass: -1 }],
  ])('refuses %s and saves nothing', async (_, override) => {
    await expect(logWeight(db, { ...WEIGH_IN, ...override })).rejects.toThrow(
      DataError,
    );
    expect(await listWeights(db)).toEqual([]);
  });
});

describe('listWeights', () => {
  it('lists the weigh-ins, the most recent first', async () => {
    await logWeight(db, { ...WEIGH_IN, weight: 74 }, new Date('2026-11-01'));
    await logWeight(db, { ...WEIGH_IN, weight: 72 }, new Date('2026-11-05'));
    await logWeight(db, { ...WEIGH_IN, weight: 73 }, new Date('2026-11-03'));

    expect((await listWeights(db)).map(({ weight }) => weight)).toEqual([
      72, 73, 74,
    ]);
  });
});

describe('updateWeight', () => {
  it('corrects the values and keeps the date', async () => {
    const entry = await logWeight(db, WEIGH_IN);

    const updated = await updateWeight(db, entry.id, {
      ...WEIGH_IN,
      weight: 71.9,
      bodyFat: null,
    });

    expect(updated).toEqual({ ...entry, weight: 71.9, bodyFat: null });
  });

  it('refuses invalid values and keeps the old ones', async () => {
    const entry = await logWeight(db, WEIGH_IN);

    await expect(
      updateWeight(db, entry.id, { ...WEIGH_IN, weight: 0 }),
    ).rejects.toThrow(DataError);
    expect(await listWeights(db)).toEqual([entry]);
  });

  it('refuses an unknown weigh-in', async () => {
    await expect(updateWeight(db, 999, WEIGH_IN)).rejects.toThrow(
      "Cette pesée n'existe plus.",
    );
  });
});

describe('deleteWeight', () => {
  it('deletes the weigh-in', async () => {
    const entry = await logWeight(db, WEIGH_IN);

    expect(await deleteWeight(db, entry.id)).toEqual(entry);
    expect(await listWeights(db)).toEqual([]);
  });

  it('refuses an unknown weigh-in', async () => {
    await expect(deleteWeight(db, 999)).rejects.toThrow(DataError);
  });
});
