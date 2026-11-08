import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** The folder of Documents where the backups are saved. */
const BACKUP_FOLDER = 'CatCHMeal';

/** In a browser, a backup is downloaded instead. */
function download(fileName: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Saves a backup file on the phone, in Documents/CatCHMeal, where the file
 * manager shows it and "Restaurer" finds it. Gives back where it went; a
 * backup of the same day replaces the one before.
 */
export async function saveBackupFile(fileName: string, content: string) {
  if (!Capacitor.isNativePlatform()) {
    download(fileName, content);
    return fileName;
  }
  await Filesystem.writeFile({
    path: `${BACKUP_FOLDER}/${fileName}`,
    data: content,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  return `Documents/${BACKUP_FOLDER}/${fileName}`;
}

/**
 * Hands a backup file to Android's share menu (Drive, e-mail...), for a copy
 * off the phone. In a browser it downloads the file instead. Closing the
 * share menu without choosing is not an error.
 */
export async function shareBackupFile(fileName: string, content: string) {
  if (!Capacitor.isNativePlatform()) {
    download(fileName, content);
    return;
  }

  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  try {
    await Share.share({ title: 'Sauvegarde CatCHMeal', files: [uri] });
  } catch (error) {
    if (!(error instanceof Error && /cancel/i.test(error.message))) {
      throw error;
    }
  }
}
