/** Where a swipe sends the user: the next tab or the previous one. */
export type SwipeDirection = 'next' | 'previous';

export interface SwipeMove {
  /** Finger travel in px: negative to the left. */
  dx: number;
  dy: number;
  durationMs: number;
  /** Width of the swiped area, in px. */
  width: number;
}

/** A quarter of the screen is enough to change tab. */
const DISTANCE_SHARE = 0.25;
/** Or a quick flick: at least 40 px at 0.5 px per ms. */
const FLICK_DISTANCE = 40;
const FLICK_SPEED = 0.5;

/** True when the finger goes more sideways than up or down. */
export function isHorizontal(dx: number, dy: number) {
  return Math.abs(dx) > Math.abs(dy) * 1.2;
}

/**
 * Whether a finished swipe changes tab, and which way: moving the finger to
 * the left shows the next tab, like turning a page.
 */
export function swipeDirection(move: SwipeMove): SwipeDirection | null {
  const { dx, dy, durationMs, width } = move;
  if (!isHorizontal(dx, dy)) return null;

  const distance = Math.abs(dx);
  const isFar = distance >= width * DISTANCE_SHARE;
  const isFlick =
    distance >= FLICK_DISTANCE &&
    distance / Math.max(durationMs, 1) >= FLICK_SPEED;
  if (!isFar && !isFlick) return null;

  return dx < 0 ? 'next' : 'previous';
}
