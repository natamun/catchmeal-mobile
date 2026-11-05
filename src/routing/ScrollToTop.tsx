import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Scrolls back to the top at every page change. It runs before the new page
 * is drawn (layout effect): after it, the page would flash at the previous
 * page's scroll position first.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}
