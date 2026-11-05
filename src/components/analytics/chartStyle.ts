/** Sizes and colors shared by the stats charts, so they all look alike. */
export const CHART_HEIGHT = 250;
export const AXIS_WIDTH = 44;
export const GRID_STROKE = 'var(--color-theme-50)';
/** Axis text in the theme's secondary color, readable on dark themes too. */
const AXIS_TEXT = 'var(--color-theme-600)';
export const AXIS_LINE = 'var(--color-theme-300)';
export const X_TICK = { fontSize: 11, fill: AXIS_TEXT };
export const Y_TICK = { fontSize: 12, fill: AXIS_TEXT };
export const MIN_TICK_GAP = 40;
/** Series of a chart: the accent, the second accent, then a quiet tone. */
export const SERIES_COLORS = [
  'var(--color-theme-500)',
  'var(--color-accent-2)',
  'var(--color-theme-400)',
];
