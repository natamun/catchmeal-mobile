import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Android back button: closes the open dialog first, then goes back in the
 * app's history, and from the first page puts the app in the background, like
 * other Android apps. Does nothing in a browser.
 */
export function handleAndroidBackButton() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  void App.addListener('backButton', ({ canGoBack }) => {
    const dialogs =
      document.querySelectorAll<HTMLDialogElement>('dialog[open]');
    const topDialog = dialogs[dialogs.length - 1];

    if (topDialog) {
      topDialog.requestClose();
    } else if (canGoBack) {
      window.history.back();
    } else {
      void App.minimizeApp();
    }
  });
}
