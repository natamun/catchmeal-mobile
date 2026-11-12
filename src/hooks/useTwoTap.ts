import { useState } from 'react';

import { ARMED_MS, twoTapOutcome } from './twoTap';
import { useTimeout } from './useTimeout';

/**
 * State of a button that asks twice: `tap` arms it, a second tap within a few
 * seconds calls `onConfirm`. A double tap too fast to be a decision is
 * ignored, and left alone the button calms down on its own. `disarm` calms it
 * at once, such as when the sheet it sits in closes.
 */
export function useTwoTap(onConfirm: () => void) {
  const [armedAt, setArmedAt] = useState<number | null>(null);
  useTimeout(() => setArmedAt(null), armedAt === null ? null : ARMED_MS);

  const tap = () => {
    const now = performance.now();
    const outcome = twoTapOutcome(armedAt, now);
    if (outcome === 'arm') {
      setArmedAt(now);
    } else if (outcome === 'confirm') {
      setArmedAt(null);
      onConfirm();
    }
  };

  return { isArmed: armedAt !== null, tap, disarm: () => setArmedAt(null) };
}
