import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { isHorizontal, swipeDirection } from './swipe';

/** Android's back gesture starts at the screen edges: leave them to it. */
const EDGE_PX = 32;
/** Travel before deciding whether the finger scrolls or swipes. */
const LOCK_PX = 10;
/** How much the pages follow the finger when there is no tab that way. */
const RUBBER_BAND = 0.25;
/** Where a swipe must not change tab: typing, reading a chart. */
const IGNORED = 'input, textarea, select, .recharts-wrapper, [data-no-swipe]';
const SLIDE = 'transform 0.3s ease-out';

/** Shows the page at `index`, shifted by `dx` px, sliding there or not. */
function placeTrack(
  track: HTMLElement,
  index: number,
  dx: number,
  isAnimated: boolean,
) {
  track.style.transition = isAnimated ? SLIDE : '';
  track.style.transform = `translateX(calc(${-index * 100}% + ${dx}px))`;
}

/**
 * The tabs as a carousel: their pages sit side by side on `track`, in the
 * order of `paths`, and the one of the current URL fills the screen.
 * Swiping sideways on `area` drags the pages with the finger, so the next
 * one shows up, then either changes tab or springs back. Changing tab from
 * the tab bar slides the pages too.
 */
export function useSwipeTabs(
  area: RefObject<HTMLElement | null>,
  track: RefObject<HTMLElement | null>,
  paths: readonly string[],
) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const index = paths.indexOf(pathname);
  /** The page shown before, or null when the carousel was hidden. */
  const shown = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = track.current;
    if (!element || index === -1) {
      shown.current = null;
      return;
    }
    placeTrack(element, index, 0, shown.current !== null);
    shown.current = index;
  }, [track, index]);

  useEffect(() => {
    const element = area.current;
    const pages = track.current;
    if (!element || !pages || index === -1) return;

    let start: { x: number; y: number; time: number } | null = null;
    let horizontal: boolean | null = null;
    let dx = 0;
    let dy = 0;

    const neighbour = (step: number) => paths[index + step];

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

      // Sideways: the pages follow the finger and do not scroll.
      event.preventDefault();
      const hasNeighbour = neighbour(dx < 0 ? 1 : -1) !== undefined;
      placeTrack(pages, index, hasNeighbour ? dx : dx * RUBBER_BAND, false);
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
      const step = direction === 'next' ? 1 : -1;
      const target = direction && neighbour(step);
      start = null;

      if (target) {
        // Slide on from where the finger left the pages.
        placeTrack(pages, index + step, 0, true);
        void navigate(target);
      } else {
        placeTrack(pages, index, 0, true);
      }
    };

    const handleCancel = () => {
      start = null;
      placeTrack(pages, index, 0, true);
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
    };
  }, [area, track, index, paths, navigate]);
}
