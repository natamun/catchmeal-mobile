import { roundDecimals } from '../../utils/decimals';

/** Room left above and below the curve, as a share of its height. */
const PADDING = 0.1;
/**
 * The smallest height shown, in the measure's unit: a flat curve, or a few
 * hundred grams of difference, must not be blown up to the full chart.
 */
const MIN_SPAN = 0.5;
/** About how many graduations the axis aims for. */
const TARGET_INTERVALS = 4;

/** A round step near `raw`: 1, 2 or 5 times a power of ten. */
function niceStep(raw: number) {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const nice =
    normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * Vertical scale of a measure chart, zoomed on the values: the curve fills
 * the chart but for a small margin, and the graduations fall on round
 * numbers inside it.
 */
export function measureScale(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, MIN_SPAN);
  const middle = (min + max) / 2;
  const bottom = Math.max(0, middle - span * (0.5 + PADDING));
  const top = middle + span * (0.5 + PADDING);

  const step = niceStep((top - bottom) / TARGET_INTERVALS);
  const ticks: number[] = [];
  for (let tick = Math.ceil(bottom / step) * step; tick <= top; tick += step) {
    ticks.push(roundDecimals(tick, 2));
  }

  return { bottom, top, ticks };
}
