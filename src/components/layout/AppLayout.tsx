import { Suspense, useCallback, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';

import { useSwipeTabs } from '../../hooks/useSwipeTabs';
import { ToastProvider } from '../ui/ToastProvider';
import { Nav } from './Nav';

const ENTER_ANIMATION = {
  left: 'animate-slide-from-left',
  right: 'animate-slide-from-right',
} as const;

/**
 * Frame of every page: navigation, the current page (Outlet) and the toasts.
 * Swiping sideways changes tab; the new page then slides in from that side.
 */
export function AppLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [enterFrom, setEnterFrom] = useState<'left' | 'right' | null>(null);
  useSwipeTabs(mainRef, setEnterFrom);
  const clearEnter = useCallback(() => setEnterFrom(null), []);

  return (
    <ToastProvider>
      <div className="min-h-screen overflow-x-clip bg-theme-50">
        <Nav />
        <main
          ref={mainRef}
          id="main-content"
          className="mx-auto max-w-6xl touch-pan-y px-6 pt-6 pb-8 pointer-coarse:pb-[calc(var(--spacing-bottom-nav)+2rem+env(safe-area-inset-bottom))]"
        >
          <div
            key={pathname}
            className={enterFrom ? ENTER_ANIMATION[enterFrom] : ''}
            onAnimationEnd={clearEnter}
          >
            <Suspense
              fallback={
                <div className="flex h-40 items-center justify-center text-sm text-theme-500">
                  Chargement...
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
