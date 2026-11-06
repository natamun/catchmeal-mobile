/**
 * Prepares the barcode scanner in the background: downloads its code and
 * compiles its decoder, the slow part of the first opening.
 */
export function preloadScanner() {
  void import('./BarcodeScannerDialog');
  import('./zxingDecoder')
    .then(({ warmUpDecoder }) => warmUpDecoder())
    .catch(() => undefined);
}
