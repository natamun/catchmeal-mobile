import {
  exportBackup,
  parseBackup,
  restoreBackup,
  type Backup,
} from '../../data/backup';
import { changing } from '../../data/changes';
import { getDatabase } from '../../db/appDatabase';
import { shareBackupFile } from '../../native/backupFile';
import { toDateKey } from '../../utils/dateKey';

/** Writes all the data to a dated JSON file and opens the share menu. */
export async function exportData() {
  const backup = await exportBackup(await getDatabase());
  await shareBackupFile(
    `catchmeal-${toDateKey(new Date())}.json`,
    JSON.stringify(backup, null, 2),
  );
}

/** Reads a file chosen by the user; throws a DataError when it is no backup. */
export async function readBackupFile(file: File) {
  return parseBackup(await file.text());
}

/** Replaces all the data with the backup, all or nothing. */
export async function restoreData(backup: Backup) {
  return changing(restoreBackup(await getDatabase(), backup));
}
