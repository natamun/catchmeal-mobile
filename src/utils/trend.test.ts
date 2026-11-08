import { describe, expect, it } from 'vitest';

import { linearTrend, slopePerDay } from './trend';

describe('linearTrend', () => {
  it('fits a straight line through noisy values', () => {
    const points = [
      { day: 0, value: 80.2 },
      { day: 7, value: 79.4 },
      { day: 14, value: 79.2 },
      { day: 21, value: 78.4 },
    ];

    const trend = linearTrend(points);

    expect(trend.slope * 7).toBeCloseTo(-0.56);
    expect(trend.valueAt(0)).toBeCloseTo(80.14);
    expect(trend.valueAt(21)).toBeCloseTo(78.46);
    expect(trend.slope).toBe(slopePerDay(points));
  });
});
