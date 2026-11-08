import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * The version installed, such as "0.9.0", or "0.9.0 dev" for the development
 * app installed beside the real one. Null outside Android.
 */
export async function installedVersion() {
  if (!Capacitor.isNativePlatform()) return null;
  const { version, id } = await App.getInfo();
  return id.endsWith('.debug') ? `${version} dev` : version;
}
