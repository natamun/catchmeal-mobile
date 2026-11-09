import { useEffect } from 'react';

/**
 * Keeps the screen on while the component is shown, such as a recipe read
 * while cooking. Android lets the lock go when the app is hidden, so it is
 * asked again when the app comes back. Does nothing without a wake lock.
 */
export function useKeepAwake() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let isDone = false;

    const request = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (isDone) void sentinel.release();
          else lock = sentinel;
        })
        .catch(() => {
          // Refused (battery saver...): the screen sleeps as usual.
        });
    };

    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      isDone = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release();
    };
  }, []);
}
