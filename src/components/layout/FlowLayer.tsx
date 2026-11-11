import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router';

import { FlowContext } from './flowContext';

/** How long the closing animation lasts, in ms. */
const EXIT_MS = 220;

/**
 * Shows a flow (adding food or exercises, a recipe) as a page sliding in
 * from the right over its tab, the tab bar hidden. Its pages close it through
 * useFlow(), so it can slide away first.
 */
export function FlowLayer({ children }: { children: ReactNode }) {
  const [isClosing, setIsClosing] = useState(false);
  const { pathname } = useLocation();
  const [shownPath, setShownPath] = useState(pathname);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Closing can lead to another page of the same flow, such as a recipe
  // sheet left for another one: that page slides in again.
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setIsClosing(false);
  }

  // Each page of the flow opens at its top, like a page of its own.
  useEffect(() => {
    scrollerRef.current?.scrollTo(0, 0);
  }, [pathname]);

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
        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="mx-auto flex min-h-full max-w-6xl flex-col px-6 pb-6">
            {children}
          </div>
        </div>
      </div>
    </FlowContext.Provider>
  );
}
