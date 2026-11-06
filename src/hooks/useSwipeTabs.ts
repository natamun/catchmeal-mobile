import { useEffect, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { PATHS } from '../routing/paths';
import { isHorizontal, swipeDirection } from './swipe';

/** The tabs in the order of the tab bar. */
const TAB_PATHS: readonly string[] = [
  PATHS.home,
  PATHS.food,
  PATHS.stats,
  PATHS.profile,
];

/** Android's back gesture starts at the screen edges: leave them to it. */
const EDGE_PX = 32;
/** Travel before deciding whether the finger scrolls or swipes. */
const LOCK_PX = 10;
/** How much the page follows the finger when there is no tab that way. */
const RUBBER_BAND = 0.25;
/** Where a swipe must not change tab: typing, reading a chart. */
const IGNORED = 'input, textarea, select, .recharts-wrapper, [data-no-swipe]';

/**
 * Swiping sideways on a tab moves to the next or previous tab. The page
 * follows the finger, then either `onChange` is told where the new page comes
 * from and the app navigates, or the page springs back.
 */
export function useSwipeTabs(
  area: RefObject<HTMLElement | null>,
  onChange: (enterFrom: 'left' | 'right') => void,
) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const element = area.current;
    const index = TAB_PATHS.indexOf(pathname);
    if (!element || index === -1) return;

    let start: { x: number; y: number; time: number } | null = null;
    let horizontal: boolean | null = null;
    let dx = 0;
    let dy = 0;

    const neighbour = (step: number) => TAB_PATHS[index + step];

    const setOffset = (x: number, animated: boolean) => {
      element.style.transition = animated ? 'transform 0.2s ease-out' : '';
      element.style.transform = x === 0 ? '' : `translateX(${x}px)`;
    };

    const handleStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const ignored =
        event.touches.length > 1 ||
        touch.clientX < EDGE_PX ||
        touch.clientX > window.innerWidth - EDGE_PX ||
        (event.target instanceof Element && event.target.closest(IGNORED)) ||
        document.querySelector('dialog[open]');
      start = ignored
        ? null
        : { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
      horizontal = null;
      dx = 0;
      dy = 0;
    };

    const handleMove = (event: TouchEvent) => {
      if (!start) return;
      const touch = event.touches[0];
      dx = touch.clientX - start.x;
      dy = touch.clientY - start.y;
      if (horizontal === null) {
        if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
        horizontal = isHorizontal(dx, dy);
      }
      if (!horizontal) return;

      // Sideways: the page follows the finger and does not scroll.
      event.preventDefault();
      const hasNeighbour = neighbour(dx < 0 ? 1 : -1) !== undefined;
      setOffset(hasNeighbour ? dx : dx * RUBBER_BAND, false);
    };

    const handleEnd = (event: TouchEvent) => {
      if (!start || !horizontal) {
        start = null;
        return;
      }
      const direction = swipeDirection({
        dx,
        dy,
        durationMs: event.timeStamp - start.time,
        width: element.clientWidth,
      });
      const target = direction && neighbour(direction === 'next' ? 1 : -1);
      start = null;

      if (target) {
        setOffset(0, false);
        onChange(direction === 'next' ? 'right' : 'left');
        void navigate(target);
      } else {
        setOffset(0, true);
      }
    };

    const handleCancel = () => {
      start = null;
      setOffset(0, true);
    };

    element.addEventListener('touchstart', handleStart, { passive: true });
    element.addEventListener('touchmove', handleMove, { passive: false });
    element.addEventListener('touchend', handleEnd);
    element.addEventListener('touchcancel', handleCancel);
    return () => {
      element.removeEventListener('touchstart', handleStart);
      element.removeEventListener('touchmove', handleMove);
      element.removeEventListener('touchend', handleEnd);
      element.removeEventListener('touchcancel', handleCancel);
      setOffset(0, false);
    };
  }, [area, pathname, navigate, onChange]);
}
