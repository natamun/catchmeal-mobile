import { openCapacitorDatabase } from './capacitorDatabase';
import type { Database } from './database';
import { migrate } from './migrations';

const DATABASE_NAME = 'catchmeal';

let opening: Promise<Database> | null = null;

/**
 * The app's database, opened and brought up to date on first use. A failed
 * opening is tried again on the next call. Only available in the Android app,
 * not in a browser.
 */
export function getDatabase(): Promise<Database> {
  opening ??= openCapacitorDatabase(DATABASE_NAME)
    .then(async (db) => {
      await migrate(db);
      return db;
    })
    .catch((error: unknown) => {
      opening = null;
      throw error;
    });
  return opening;
}
