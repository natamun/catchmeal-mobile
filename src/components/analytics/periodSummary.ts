import { middayOf, startOfDay, toDateKey } from '../../utils/dateKey';
import { linearTrend } from '../../utils/trend';
import type { Workout } from '../fitness/types';
import type { DashboardDay } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
/** A trend needs a few measures spread over two weeks at least. */
const MIN_TREND_POINTS = 3;
const MIN_TREND_DAYS = 14;
/** Weekdays and weekend are compared only with enough of both. */
const MIN_WEEKEND_DAYS = 2;
const MIN_WEEK_DAYS = 4;

/**
 * The straight line that fits the measures (least squares), from the first
 * to the last, with its change per week; null with fewer than 3 measures or
 * under two weeks.
 */
export function trendOf(points: { value: number; time: number }[]) {
  if (points.length < MIN_TREND_POINTS) return null;
  const first = points[0].time;
  const last = points.at(-1)!.time;
  if (last - first < MIN_TREND_DAYS * DAY_MS) return null;
  const line = linearTrend(
    points.map(({ value, time }) => ({ day: (time - first) / DAY_MS, value })),
  );
  return {
    ends: [
      { time: first, value: line.valueAt(0) },
      { time: last, value: line.valueAt((last - first) / DAY_MS) },
    ],
    perWeek: line.slope * 7,
  };
}

/** What the summary needs from the profile. */
export interface SummaryProfile {
  dailyCalorieGoal: number | null;
  dailyProteinGoal: number | null;
}

/** The period at a glance, each figure null when the journal cannot tell it. */
export interface PeriodSummary {
  periodDays: number;
  /** The days of the period that are over: today is not. */
  countableDays: number;
  loggedDays: number;
  kcal: { average: number; goal: number | null } | null;
  protein: { average: number; goal: number | null } | null;
  /** Average calories of a weekday (Monday to Friday) and of a weekend day. */
  weekSplit: { week: number; weekend: number } | null;
  weight: {
    first: number;
    last: number;
    perWeek: number | null;
  } | null;
  sessions: { count: number; perWeek: number | null };
}

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Sums up a period of the journal: average calories and protein with the
 * average goal of the logged days (the profile's when a day has none), a
 * weekday against a weekend day, the weight's first and last weigh-ins and its
 * pace per week, and the sessions per week. Days without a logged meal, and
 * today, which is not over, are left out of the averages.
 */
export function summarizePeriod(
  days: DashboardDay[],
  workouts: Workout[],
  from: string,
  to: string,
  profile: SummaryProfile,
  today = new Date(),
): PeriodSummary {
  const periodDays =
    Math.round(
      (startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS,
    ) + 1;
  // Today is not over: its meals would pull the averages down.
  const todayKey = toDateKey(today);
  const logged = days.filter(
    (day) => day.totalKcal !== null && day.day !== todayKey,
  );

  const kcalGoalOf = (day: DashboardDay) =>
    day.goalKcal ?? profile.dailyCalorieGoal;
  const proteinGoalOf = (day: DashboardDay) =>
    day.goalProtein ?? profile.dailyProteinGoal;

  const kcal =
    logged.length === 0
      ? null
      : {
          average: Math.round(average(logged.map((day) => day.totalKcal!))),
          goal: averageGoal(logged.map(kcalGoalOf)),
        };

  const protein =
    logged.length === 0
      ? null
      : {
          average: Math.round(
            average(logged.map((day) => day.totalProtein ?? 0)),
          ),
          goal: averageGoal(logged.map(proteinGoalOf)),
        };

  const weekSplit = weekSplitOf(logged);

  const points = days.flatMap((day) =>
    day.weight === null ? [] : [{ value: day.weight, time: middayOf(day.day) }],
  );
  const trend = trendOf(points);
  const last = points.at(-1)?.value;
  const weight =
    last === undefined
      ? null
      : {
          first: points[0].value,
          last,
          perWeek: trend?.perWeek ?? null,
        };

  return {
    periodDays,
    countableDays:
      todayKey >= from && todayKey <= to ? periodDays - 1 : periodDays,
    loggedDays: logged.length,
    kcal,
    protein,
    weekSplit,
    weight,
    sessions: {
      count: workouts.length,
      perWeek: periodDays >= 7 ? (workouts.length * 7) / periodDays : null,
    },
  };
}

const isWeekend = (day: DashboardDay) => {
  const weekday = startOfDay(day.day).getDay();
  return weekday === 0 || weekday === 6;
};

/**
 * Average calories of a weekday (Monday to Friday) and of a weekend day over
 * the logged days given, or null with fewer than 4 weekdays or 2 weekend days.
 */
function weekSplitOf(logged: DashboardDay[]) {
  const weekend = logged.filter(isWeekend).map((day) => day.totalKcal!);
  const week = logged
    .filter((day) => !isWeekend(day))
    .map((day) => day.totalKcal!);
  return weekend.length >= MIN_WEEKEND_DAYS && week.length >= MIN_WEEK_DAYS
    ? {
        week: Math.round(average(week)),
        weekend: Math.round(average(weekend)),
      }
    : null;
}

/** Rounded average of the goals that are set, null when none is. */
function averageGoal(goals: (number | null)[]) {
  const set = goals.filter((goal) => goal !== null);
  return set.length === 0 ? null : Math.round(average(set));
}
