import { describe, expect, it } from 'vitest';

import { swipeDirection, type SwipeMove } from './swipe';

const WIDTH = 384;
const slow = (dx: number, dy = 0): SwipeMove => ({
  dx,
  dy,
  durationMs: 1000,
  width: WIDTH,
});

describe('swipeDirection', () => {
  it('shows the next tab when the finger goes left past a quarter', () => {
    expect(swipeDirection(slow(-100))).toBe('next');
  });

  it('shows the previous tab when the finger goes right past a quarter', () => {
    expect(swipeDirection(slow(100))).toBe('previous');
  });

  it('accepts a short but quick flick', () => {
    expect(
      swipeDirection({ dx: -60, dy: 5, durationMs: 80, width: WIDTH }),
    ).toBe('next');
  });

  it.each<[string, SwipeMove]>([
    ['a short slow move', slow(-60)],
    ['a vertical scroll', slow(-120, -200)],
    ['a diagonal move', slow(-120, 110)],
    [
      'a quick but tiny flick',
      { dx: -30, dy: 0, durationMs: 20, width: WIDTH },
    ],
  ])('ignores %s', (_, move) => {
    expect(swipeDirection(move)).toBeNull();
  });
});
