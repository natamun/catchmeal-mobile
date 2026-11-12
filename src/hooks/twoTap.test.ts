import { describe, expect, it } from 'vitest';

import { ARMED_MS, MIN_CONFIRM_MS, twoTapOutcome } from './twoTap';

describe('twoTapOutcome', () => {
  it('arms on the first tap', () => {
    expect(twoTapOutcome(null, 1000)).toBe('arm');
  });

  it('confirms on a second tap once armed', () => {
    expect(twoTapOutcome(1000, 1000 + MIN_CONFIRM_MS)).toBe('confirm');
    expect(twoTapOutcome(1000, 1000 + ARMED_MS - 1)).toBe('confirm');
  });

  it('refuses a second tap that comes too fast, a double tap', () => {
    expect(twoTapOutcome(1000, 1000)).toBe('ignore');
    expect(twoTapOutcome(1000, 1000 + MIN_CONFIRM_MS - 1)).toBe('ignore');
  });

  it('refuses to confirm once the button calmed down, and arms again', () => {
    expect(twoTapOutcome(1000, 1000 + ARMED_MS)).toBe('arm');
  });
});
