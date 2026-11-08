import {
  exportBackup,
  parseBackup,
  restoreBackup,
  type Backup,
} from '../../data/backup';
import { changing } from '../../data/changes';
import { getDatabase } from '../../db/appDatabase';
import { saveBackupFile, shareBackupFile } from '../../native/backupFile';
import { toDateKey } from '../../utils/dateKey';

/** All the data as a dated JSON file: its name and its content. */
async function backupFile() {
  const backup = await exportBackup(await getDatabase());
  return [
    `catchmeal-${toDateKey(new Date())}.json`,
    JSON.stringify(backup, null, 2),
  ] as const;
}

/** Saves all the data on the phone; gives back where the file went. */
export async function saveData() {
  return saveBackupFile(...(await backupFile()));
}

/** Writes all the data to a file and opens the share menu. */
export async function shareData() {
  await shareBackupFile(...(await backupFile()));
}

/** Reads a file chosen by the user; throws a DataError when it is no backup. */
export async function readBackupFile(file: File) {
  return parseBackup(await file.text());
}

/** Replaces all the data with the backup, all or nothing. */
export async function restoreData(backup: Backup) {
  return changing(restoreBackup(await getDatabase(), backup));
}
