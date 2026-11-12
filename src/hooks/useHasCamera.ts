import { useEffect, useState } from 'react';

import { canScanBarcodes } from '../native/barcodeScanner';

/**
 * Whether the phone can scan barcodes, to show the scan button only when
 * scanning is possible. Asks no permission.
 */
export function useHasCamera() {
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    let cancelled = false;
    canScanBarcodes()
      .then((supported) => {
        if (!cancelled) {
          setHasCamera(supported);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return hasCamera;
}
