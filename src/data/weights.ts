import type { LogWeightInput, WeightEntry } from '../components/profile/api';
import type { Executor } from '../db/database';
import { DataError } from './errors';
import { checkNumber, checkOptionalNumber } from './validation';

const GONE = "Cette pesée n'existe plus.";

interface WeightRow {
  id: number;
  weight: number;
  body_fat: number | null;
  fat_free_mass: number | null;
  body_water: number | null;
  muscle_mass: number | null;
  logged_at: string;
}

const COLUMNS =
  'id, weight, body_fat, fat_free_mass, body_water, muscle_mass, logged_at';

function toEntry(row: WeightRow): WeightEntry {
  return {
    id: row.id,
    weight: row.weight,
    bodyFat: row.body_fat,
    fatFreeMass: row.fat_free_mass,
    bodyWater: row.body_water,
    muscleMass: row.muscle_mass,
    loggedAt: row.logged_at,
  };
}

const MASS = { min: 0, exclusive: true, max: 500 };
const PERCENT = { min: 0, exclusive: true, max: 100 };

/** The values of a weigh-in, checked; an empty measure is null. */
function validate(input: LogWeightInput) {
  return [
    checkNumber(input.weight, 'poids', MASS),
    checkOptionalNumber(input.bodyFat, 'masse grasse', PERCENT),
    checkOptionalNumber(input.fatFreeMass, 'masse maigre', MASS),
    checkOptionalNumber(input.bodyWater, 'eau corporelle', PERCENT),
    checkOptionalNumber(input.muscleMass, 'masse musculaire', MASS),
  ];
}

async function findWeight(db: Executor, id: number) {
  const [row] = await db.query<WeightRow>(
    `SELECT ${COLUMNS} FROM weight_log WHERE id = ?`,
    [id],
  );
  if (!row) throw new DataError(GONE);
  return toEntry(row);
}

/** Every weigh-in, the most recent first. */
export async function listWeights(db: Executor) {
  const rows = await db.query<WeightRow>(
    `SELECT ${COLUMNS} FROM weight_log ORDER BY logged_at DESC, id DESC`,
  );
  return rows.map(toEntry);
}

/** Records a weigh-in dated `now`. */
export async function logWeight(
  db: Executor,
  input: LogWeightInput,
  now = new Date(),
) {
  const { lastId } = await db.run(
    `INSERT INTO weight_log (weight, body_fat, fat_free_mass, body_water, muscle_mass, logged_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [...validate(input), now.toISOString()],
  );
  return findWeight(db, lastId);
}

/** Corrects a weigh-in; its date stays. */
export async function updateWeight(
  db: Executor,
  id: number,
  input: LogWeightInput,
) {
  const { changes } = await db.run(
    `UPDATE weight_log
     SET weight = ?, body_fat = ?, fat_free_mass = ?, body_water = ?, muscle_mass = ?
     WHERE id = ?`,
    [...validate(input), id],
  );
  if (changes === 0) throw new DataError(GONE);
  return findWeight(db, id);
}

/** Deletes a weigh-in. */
export async function deleteWeight(db: Executor, id: number) {
  const entry = await findWeight(db, id);
  await db.run('DELETE FROM weight_log WHERE id = ?', [id]);
  return entry;
}
