import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { FlowContext } from './flowContext';

/** How long the closing animation lasts, in ms. */
const EXIT_MS = 220;

/**
 * Shows an adding flow (food or exercises) as a page sliding in from the
 * right over the journal, the tab bar hidden. Its pages close it through
 * useFlow(), so it can slide away first.
 */
export function FlowLayer({ children }: { children: ReactNode }) {
  const [isClosing, setIsClosing] = useState(false);
  const close = useCallback((leave: () => void) => {
    setIsClosing(true);
    window.setTimeout(leave, EXIT_MS);
  }, []);
  const flow = useMemo(() => ({ close }), [close]);

  return (
    <FlowContext.Provider value={flow}>
      <div
        className={`fixed inset-0 z-30 flex flex-col bg-theme-50 pt-[env(safe-area-inset-top)] shadow-2xl ${isClosing ? 'animate-page-out' : 'animate-page-in'}`}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-6xl px-6 pb-6">{children}</div>
        </div>
      </div>
    </FlowContext.Provider>
  );
}
