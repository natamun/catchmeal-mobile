import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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

/** The other tabs are prepared this long after the first one is shown. */
const PREPARE_DELAY_MS = 300;

const ENTER_ANIMATION = {
  left: 'animate-slide-from-left',
  right: 'animate-slide-from-right',
} as const;

const LOADING = (
  <div className="flex h-40 items-center justify-center text-sm text-theme-500">
    Chargement...
  </div>
);

/**
 * Frame of every page: navigation, the pages and the toasts. The four tabs
 * stay mounted and only the current one is shown: switching tab keeps each
 * one's data and state, and the app prepares them all right after it opens.
 * Other pages (adding to the journal) come through the Outlet. Swiping
 * sideways changes tab; the new tab then slides in from that side.
 */
export function AppLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [enterFrom, setEnterFrom] = useState<'left' | 'right' | null>(null);
  useSwipeTabs(mainRef, setEnterFrom);
  const clearEnter = useCallback(() => setEnterFrom(null), []);

  const activeTab = TABS.find((tab) => tab.path === pathname)?.path ?? null;
  const [areAllPrepared, setAreAllPrepared] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAreAllPrepared(true), PREPARE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen overflow-x-clip bg-theme-50">
        <Nav />
        <main
          ref={mainRef}
          id="main-content"
          className="mx-auto max-w-6xl touch-pan-y px-6 pt-6 pb-8 pointer-coarse:pb-[calc(var(--spacing-bottom-nav)+2rem+env(safe-area-inset-bottom))]"
        >
          {TABS.map(({ path, Page }) =>
            areAllPrepared || path === activeTab ? (
              <div
                key={path}
                hidden={path !== activeTab}
                className={
                  path === activeTab && enterFrom
                    ? ENTER_ANIMATION[enterFrom]
                    : ''
                }
                onAnimationEnd={clearEnter}
              >
                <Suspense fallback={LOADING}>
                  <Page />
                </Suspense>
              </div>
            ) : null,
          )}
          {activeTab === null && (
            <Suspense fallback={LOADING}>
              <Outlet />
            </Suspense>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
