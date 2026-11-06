/**
 * Slope of values over time, in units per day, by least squares: the trend
 * of noisy measures. Needs two different days at least.
 */
export function slopePerDay(points: readonly { day: number; value: number }[]) {
  const n = points.length;
  const meanDay = points.reduce((sum, p) => sum + p.day, 0) / n;
  const meanValue = points.reduce((sum, p) => sum + p.value, 0) / n;
  let covariance = 0;
  let variance = 0;
  for (const { day, value } of points) {
    covariance += (day - meanDay) * (value - meanValue);
    variance += (day - meanDay) ** 2;
  }
  return covariance / variance;
}
