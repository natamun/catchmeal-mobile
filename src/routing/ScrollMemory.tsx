import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * Each page comes back where it was left: the scroll position is kept per
 * page and set again before the page is drawn (layout effect). A page never
 * seen opens at the top.
 */
export function ScrollMemory() {
  const { pathname } = useLocation();
  const positions = useRef(new Map<string, number>());
  const current = useRef(pathname);

  useEffect(() => {
    const remember = () => positions.current.set(current.current, scrollY);
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, []);

  useLayoutEffect(() => {
    current.current = pathname;
    window.scrollTo({ top: positions.current.get(pathname) ?? 0 });
  }, [pathname]);

  return null;
}
