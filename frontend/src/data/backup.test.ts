import { beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { openMemoryDatabase } from '../test/nodeDatabase';
import {
  BACKUP_FORMAT,
  exportBackup,
  parseBackup,
  restoreBackup,
  type Backup,
} from './backup';
import { DataError } from './errors';
import { archiveFoodItem, createFoodItem } from './foodItems';
import { createMeal } from './meals';
import { updateProfile } from './profile';
import { logWeight } from './weights';

const NOW = new Date('2026-11-05T09:00:00.000Z');

async function freshDatabase() {
  const db = openMemoryDatabase();
  await migrate(db);
  return db;
}

/** A database with something in every table. */
async function filledDatabase() {
  const db = await freshDatabase();
  const apple = await createFoodItem(db, {
    name: 'Pomme',
    brand: 'Migros',
    barcode: '7610200337467',
    baseQuantity: 100,
    baseUnit: 'GRAM',
    kcal: 52,
    protein: 0.3,
    carbs: 14,
    fat: 0.2,
  });
  const old = await createFoodItem(db, { ...apple, name: 'Vieux pain' });
  await createMeal(db, {
    typeMeal: 'LUNCH',
    loggedAt: '2026-11-04',
    items: [
      { foodItemId: old.id, quantity: 50 },
      { quantity: 1, kcal: 300, protein: 10, carbs: 30, fat: 12 },
    ],
  });
  await archiveFoodItem(db, old.id);
  await createMeal(db, {
    name: 'Bircher',
    items: [{ foodItemId: apple.id, quantity: 80 }],
  });
  await logWeight(db, {
    weight: 72.4,
    bodyFat: 18,
    fatFreeMass: null,
    bodyWater: null,
    muscleMass: 33,
  });
  await updateProfile(db, {
    height: 178,
    targetWeight: 70,
    dailyCalorieGoal: 2100,
    gender: 'MALE',
    birthDate: '1990-04-12',
    activityLevel: 'LIGHTLY_ACTIVE',
  });
  return db;
}

const asText = (content: unknown) => JSON.stringify(content);

describe('backup', () => {
  let source: Database;
  let backup: Backup;

  beforeEach(async () => {
    source = await filledDatabase();
    backup = await exportBackup(source, NOW);
  });

  it('exports every table with the app name and the format', () => {
    expect(backup).toMatchObject({
      app: 'CatCHMeal',
      format: BACKUP_FORMAT,
      exportedAt: NOW.toISOString(),
      profile: { height: 178, gender: 'MALE' },
    });
    expect(backup.food_item).toHaveLength(2);
    expect(backup.meal).toHaveLength(2);
    expect(backup.meal_item).toHaveLength(3);
    expect(backup.weight_log).toHaveLength(1);
    expect(backup.goal_setting).toHaveLength(1);
  });

  it('restores exactly what was exported', async () => {
    const target = await freshDatabase();

    const summary = await restoreBackup(target, parseBackup(asText(backup)));

    expect(await exportBackup(target, NOW)).toEqual(backup);
    expect(summary).toEqual({ foodItems: 2, meals: 1, weighIns: 1 });
  });

  it('restores a meal that points to another one, whatever their order', async () => {
    const [source, copy] = backup.meal;
    const linked = structuredClone(backup);
    linked.meal = [{ ...copy, source_meal_id: source.id }, { ...source }];
    const target = await freshDatabase();

    await restoreBackup(target, parseBackup(asText(linked)));

    expect(
      await target.query('SELECT source_meal_id FROM meal WHERE id = ?', [
        copy.id,
      ]),
    ).toEqual([{ source_meal_id: source.id }]);
  });

  it('replaces the data already there', async () => {
    const target = await filledDatabase();
    await createFoodItem(target, {
      name: 'En trop',
      brand: null,
      barcode: null,
      baseQuantity: 1,
      baseUnit: 'PIECE',
      kcal: 1,
      protein: 0,
      carbs: 0,
      fat: 0,
    });

    await restoreBackup(target, parseBackup(asText(backup)));

    expect(await exportBackup(target, NOW)).toEqual(backup);
  });

  describe('refuses and changes nothing', () => {
    let target: Database;
    let before: Backup;

    beforeEach(async () => {
      target = await filledDatabase();
      before = await exportBackup(target, NOW);
    });

    const unchanged = async () =>
      expect(await exportBackup(target, NOW)).toEqual(before);

    it.each([
      ['a file that is not JSON', 'pas du JSON'],
      ['a file of another app', asText({ app: 'Autre', format: 1 })],
      ['a file without its tables', asText({ app: 'CatCHMeal', format: 1 })],
    ])('%s', async (_, text) => {
      expect(() => parseBackup(text)).toThrow(
        "Ce fichier n'est pas une sauvegarde CatCHMeal.",
      );
      await unchanged();
    });

    it('a file from a newer version of the app', async () => {
      const newer = asText({ ...backup, format: BACKUP_FORMAT + 1 });

      expect(() => parseBackup(newer)).toThrow(
        "Cette sauvegarde vient d'une version plus récente de l'app.",
      );
      await unchanged();
    });

    it('a row that breaks a rule of the database', async () => {
      const broken = structuredClone(backup);
      broken.food_item[0].kcal = -5;

      await expect(
        restoreBackup(target, parseBackup(asText(broken))),
      ).rejects.toThrow(DataError);
      await unchanged();
    });

    it('a line that points to a missing meal', async () => {
      const broken = structuredClone(backup);
      broken.meal_item[0].meal_id = 999;

      await expect(
        restoreBackup(target, parseBackup(asText(broken))),
      ).rejects.toThrow(DataError);
      await unchanged();
    });
  });
});
