import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';

/** Puts a text in the phone's clipboard. */
export async function copyText(text: string) {
  await Clipboard.write({ string: text });
}

/**
 * Hands a text to Android's share menu (Claude, ChatGPT, notes...). Closing
 * the menu without choosing is not an error.
 */
export async function shareText(title: string, text: string) {
  try {
    await Share.share({ title, text, dialogTitle: title });
  } catch (error) {
    if (!(error instanceof Error && /cancel/i.test(error.message))) {
      throw error;
    }
  }
}
