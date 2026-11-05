import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Hands a backup file to Android's share menu (Drive, e-mail, Files...). In a
 * browser it downloads the file instead. Closing the share menu without
 * choosing is not an error.
 */
export async function shareBackupFile(fileName: string, content: string) {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(
      new Blob([content], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
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
