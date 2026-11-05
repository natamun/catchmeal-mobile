import { Suspense } from 'react';
import { Outlet } from 'react-router';

import { ToastProvider } from '../ui/ToastProvider';
import { Nav } from './Nav';

/**
 * Frame of every page: navigation, the current page (Outlet) and the toasts.
 */
export function AppLayout() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-green-50">
        <Nav />
        <main
          id="main-content"
          className="mx-auto max-w-6xl px-6 pt-6 pb-8 pointer-coarse:pb-[calc(var(--spacing-bottom-nav)+2rem+env(safe-area-inset-bottom))]"
        >
          <Suspense
            fallback={
              <div className="flex h-40 items-center justify-center text-sm text-green-500">
                Chargement...
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </ToastProvider>
  );
}
