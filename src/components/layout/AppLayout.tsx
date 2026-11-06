import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';

import { useSwipeTabs } from '../../hooks/useSwipeTabs';
import { PATHS } from '../../routing/paths';
import { ToastProvider } from '../ui/ToastProvider';
import { Nav } from './Nav';

/** The four tabs, kept mounted once opened so going back to one is instant. */
const TABS = [
  { path: PATHS.home, Page: lazy(() => import('../../pages/HomePage')) },
  { path: PATHS.food, Page: lazy(() => import('../../pages/FoodPage')) },
  { path: PATHS.stats, Page: lazy(() => import('../../pages/StatsPage')) },
  { path: PATHS.profile, Page: lazy(() => import('../../pages/ProfilePage')) },
];
const TAB_PATHS: readonly string[] = TABS.map((tab) => tab.path);

/** The other tabs are prepared this long after the first one is shown. */
const PREPARE_DELAY_MS = 300;

/** A page's own scroll, so each tab keeps where it was. */
const SCROLLER = 'h-full overflow-y-auto';
const PAGE =
  'mx-auto max-w-6xl px-6 pt-6 pb-8 pointer-coarse:pb-[calc(var(--spacing-bottom-nav)+2rem+env(safe-area-inset-bottom))]';

const LOADING = (
  <div className="flex h-40 items-center justify-center text-sm text-theme-500">
    Chargement...
  </div>
);

/**
 * Frame of every page: navigation, the pages and the toasts. The four tabs
 * sit side by side as a carousel and stay mounted: switching tab keeps each
 * one's data, state and scroll, and the app prepares them all right after it
 * opens. The tabs off screen cannot be focused or touched. Other pages
 * (adding to the journal) come through the Outlet, over the hidden carousel.
 */
export function AppLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  useSwipeTabs(mainRef, trackRef, TAB_PATHS);

  const activeIndex = TAB_PATHS.indexOf(pathname);
  const [areAllPrepared, setAreAllPrepared] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAreAllPrepared(true), PREPARE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-[calc(100dvh-env(safe-area-inset-top))] flex-col bg-theme-50">
        <Nav />
        <main
          ref={mainRef}
          id="main-content"
          className="min-h-0 flex-1 touch-pan-y overflow-x-clip"
        >
          <div
            ref={trackRef}
            hidden={activeIndex === -1}
            className="flex h-full will-change-transform"
          >
            {TABS.map(({ path, Page }, index) => (
              <div
                key={path}
                inert={index !== activeIndex}
                className={`${SCROLLER} w-full shrink-0`}
              >
                <div className={PAGE}>
                  {(areAllPrepared || index === activeIndex) && (
                    <Suspense fallback={LOADING}>
                      <Page />
                    </Suspense>
                  )}
                </div>
              </div>
            ))}
          </div>
          {activeIndex === -1 && (
            <div className={SCROLLER}>
              <div className={PAGE}>
                <Suspense fallback={LOADING}>
                  <Outlet />
                </Suspense>
              </div>
            </div>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
