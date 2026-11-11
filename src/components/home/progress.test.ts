import { describe, expect, it } from 'vitest';

import { progressScale } from './progress';

describe('progressScale', () => {
  it('fills up to the goal, the goal at the end', () => {
    expect(progressScale(120, 160)).toEqual({ reached: 0.75, goalAt: 1 });
    expect(progressScale(160, 160)).toEqual({ reached: 1, goalAt: 1 });
  });

  it('beyond the goal, fills the bar and marks the goal inside it', () => {
    expect(progressScale(300, 240)).toEqual({ reached: 1, goalAt: 0.8 });
  });

  it('shows nothing without a value or a goal', () => {
    expect(progressScale(0, 160)).toEqual({ reached: 0, goalAt: 1 });
    expect(progressScale(50, 0)).toEqual({ reached: 0, goalAt: 1 });
  });
});
