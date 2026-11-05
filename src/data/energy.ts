import type { Executor } from '../db/database';
import { endOfDay, startOfDay, toDateKey } from '../utils/dateKey';

/** The days looked at: the last four weeks, today left out (not over yet). */
const WINDOW_DAYS = 28;
/** Below this, the average and the trend move too much to be trusted. */
const MIN_LOGGED_DAYS = 14;
const MIN_WEIGH_INS = 3;
const MIN_WEIGH_SPAN_DAYS = 14;
const KCAL_PER_KG = 7700;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface WeighIn {
  /** Days since the start of the period. */
  day: number;
  weight: number;
}

/** The expenditure measured from the journal, with what it is based on. */
export interface MeasuredExpenditure {
  kcal: number;
  loggedDays: number;
  weighIns: number;
}

/** Slope of the weight in kg per day, by least squares over the weigh-ins. */
function weightTrend(weighIns: WeighIn[]) {
  const n = weighIns.length;
  const meanDay = weighIns.reduce((sum, w) => sum + w.day, 0) / n;
  const meanWeight = weighIns.reduce((sum, w) => sum + w.weight, 0) / n;
  let covariance = 0;
  let variance = 0;
  for (const { day, weight } of weighIns) {
    covariance += (day - meanDay) * (weight - meanWeight);
    variance += (day - meanDay) ** 2;
  }
  return covariance / variance;
}

/**
 * Real daily expenditure from what was eaten and how the weight moved: the
 * average intake, plus the energy of the weight lost (or minus the weight
 * gained). Null when there are too few logged days or weigh-ins.
 */
export function estimateExpenditure(
  intakes: number[],
  weighIns: WeighIn[],
): number | null {
  if (intakes.length < MIN_LOGGED_DAYS || weighIns.length < MIN_WEIGH_INS) {
    return null;
  }
  const days = weighIns.map((w) => w.day);
  if (Math.max(...days) - Math.min(...days) < MIN_WEIGH_SPAN_DAYS) {
    return null;
  }
  const averageIntake =
    intakes.reduce((sum, kcal) => sum + kcal, 0) / intakes.length;
  const kcal = averageIntake - weightTrend(weighIns) * KCAL_PER_KG;
  return Math.round(kcal / 10) * 10;
}

/**
 * Measures the expenditure over the last four weeks of the journal. Days
 * without any logged meal are left out rather than counted as zero.
 */
export async function measureExpenditure(
  db: Executor,
  today = new Date(),
): Promise<MeasuredExpenditure | null> {
  const first = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - WINDOW_DAYS,
  );
  const last = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  );
  const from = toDateKey(first);
  const to = toDateKey(last);

  const intakes = await db.query<{ kcal: number }>(
    `SELECT sum(i.kcal) AS kcal FROM meal m JOIN meal_item i ON i.meal_id = m.id
     WHERE m.logged_at BETWEEN ? AND ? GROUP BY m.logged_at`,
    [from, to],
  );
  const weights = await db.query<{ weight: number; logged_at: string }>(
    `SELECT weight, logged_at FROM weight_log
     WHERE logged_at >= ? AND logged_at < ? ORDER BY logged_at`,
    [startOfDay(from).toISOString(), endOfDay(to).toISOString()],
  );

  const start = startOfDay(from).getTime();
  const weighIns = weights.map((row) => ({
    day: (new Date(row.logged_at).getTime() - start) / DAY_MS,
    weight: row.weight,
  }));
  const kcal = estimateExpenditure(
    intakes.map((row) => row.kcal),
    weighIns,
  );

  return kcal === null
    ? null
    : { kcal, loggedDays: intakes.length, weighIns: weighIns.length };
}
