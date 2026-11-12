import {
  BarcodeFormat,
  BarcodeScanner,
} from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

/** Product barcodes only (EAN and UPC), the ones printed on food packaging. */
const FORMATS = [
  BarcodeFormat.Ean13,
  BarcodeFormat.Ean8,
  BarcodeFormat.UpcA,
  BarcodeFormat.UpcE,
];

/**
 * Google's scanner module is not on the phone yet: its download has started,
 * the scan works once it is done.
 */
export class ScannerNotReadyError extends Error {}

/** Whether the phone can scan barcodes: the app on Android, with a camera. */
export async function canScanBarcodes() {
  if (!Capacitor.isNativePlatform()) return false;
  const { supported } = await BarcodeScanner.isSupported();
  return supported;
}

/** Starts downloading Google's scanner module when it is missing. */
async function ensureModule() {
  const { available } =
    await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) {
    // Throws when a download is already running: nothing to do then.
    await BarcodeScanner.installGoogleBarcodeScannerModule().catch(
      () => undefined,
    );
  }
  return available;
}

/**
 * Gets Google's scanner module ready ahead of the first scan. The manifest
 * already asks for it at install; this covers a download that failed.
 */
export async function prepareBarcodeScanner() {
  if (await canScanBarcodes()) {
    await ensureModule();
  }
}

/**
 * Opens Google's scanner (ML Kit), full screen over the app: Android picks
 * the camera and focuses, and no camera permission is asked. Gives the
 * barcode read, or null when the scanner is closed without one. Throws
 * ScannerNotReadyError while its module is still downloading.
 */
export async function scanBarcode() {
  if (!(await ensureModule())) {
    throw new ScannerNotReadyError();
  }
  try {
    const { barcodes } = await BarcodeScanner.scan({ formats: FORMATS });
    return barcodes[0]?.rawValue ?? null;
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) {
      return null;
    }
    throw error;
  }
}
