import { describe, expect, it } from 'vitest';

import { measureScale } from './measureScale';

describe('measureScale', () => {
  it('zooms on the curve, leaving a small margin', () => {
    const { bottom, top } = measureScale([75.2, 76.1, 77]);
    const share = (77 - 75.2) / (top - bottom);
    expect(bottom).toBeLessThan(75.2);
    expect(top).toBeGreaterThan(77);
    expect(share).toBeGreaterThan(0.8);
  });

  it('puts round graduations inside the chart', () => {
    expect(measureScale([75.2, 77]).ticks).toEqual([75.5, 76, 76.5, 77]);
  });

  it('keeps steps of 1, 2 or 5 on wide ranges', () => {
    expect(measureScale([70, 90]).ticks).toEqual([70, 75, 80, 85, 90]);
  });

  it('never shows more than one decimal', () => {
    for (const values of [[18.2, 18.9], [75.2, 75.3], [50], [3, 4.1]]) {
      for (const tick of measureScale(values).ticks) {
        expect(Math.round(tick * 10) / 10).toBe(tick);
      }
    }
  });

  it('does not blow up a tiny difference to the full height', () => {
    const { bottom, top } = measureScale([75.2, 75.3]);
    expect(top - bottom).toBeGreaterThanOrEqual(1.5);
  });

  it('gives a flat curve some height around its value', () => {
    const { bottom, top, ticks } = measureScale([80, 80]);
    expect(bottom).toBeLessThan(80);
    expect(top).toBeGreaterThan(80);
    expect(ticks).toContain(80);
  });

  it('never goes below zero', () => {
    expect(measureScale([0.1, 0.2]).bottom).toBe(0);
  });
});
