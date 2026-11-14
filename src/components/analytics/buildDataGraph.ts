import { startOfDay, toDateKey } from '../../utils/dateKey';
import type { DashboardDay, DataGraph, Grain, NumericKey } from './types';

/** Narrowest a bar may get, in px, before the bars are grouped. */
const PX_PER_POINT = 24;

/**
 * Rounded average of one value over days, skipping the days without data; 0
 * when no day has any.
 */
function averageOf(days: DashboardDay[], key: NumericKey) {
  const values = days.flatMap((day) => day[key] ?? []);

  if (values.length === 0) {
    return 0;
  }

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

/** "2026-10-20" becomes "20/10". */
const shortDate = (day: string) => day.slice(5).split('-').reverse().join('/');

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** The Monday of the week of a day. */
function mondayOf(day: string) {
  const date = startOfDay(day);
  return addDays(date, -((date.getDay() + 6) % 7));
}

/** Every day from `from` to `to` (YYYY-MM-DD), both included. */
function calendarDays(from: string, to: string) {
  const days: string[] = [];
  const last = startOfDay(to);
  for (let day = startOfDay(from); day <= last; day = addDays(day, 1)) {
    days.push(toDateKey(day));
  }
  return days;
}

/**
 * The calendar days of the period cut into groups of one day, one week or two
 * weeks. Weeks run Monday to Sunday, so the first and last ones may be cut
 * short by the period.
 */
export function groupDays(from: string, to: string, grain: Grain) {
  const days = calendarDays(from, to);
  if (grain === 'day') return days.map((day) => [day]);

  const weeks = grain === 'week' ? 1 : 2;
  const firstMonday = mondayOf(from).getTime();
  const groups = new Map<number, string[]>();
  for (const day of days) {
    const week = Math.round(
      (mondayOf(day).getTime() - firstMonday) / (7 * 24 * 60 * 60 * 1000),
    );
    const index = Math.floor(week / weeks);
    groups.set(index, [...(groups.get(index) ?? []), day]);
  }
  return [...groups.values()];
}

/** How many weeks (Monday to Sunday) the period touches. */
function weekCount(from: string, to: string) {
  return groupDays(from, to, 'week').length;
}

/**
 * The finest grouping whose bars keep at least 24 px in `plotWidth`: one bar
 * per day, else per week, else per two weeks. Without `allowDays`, weeks at
 * the finest.
 */
export function grainForWidth(
  plotWidth: number,
  from: string,
  to: string,
  allowDays = true,
): Grain {
  const maxPoints = Math.floor(plotWidth / PX_PER_POINT);
  if (allowDays && calendarDays(from, to).length <= maxPoints) return 'day';
  if (weekCount(from, to) <= maxPoints) return 'week';
  return 'biWeek';
}

/**
 * One point per group of calendar days (see `groupDays`), each value averaged
 * over the days of the group that hold it: a forgotten day does not stretch a
 * week, nor count as zero. A group counts only its days that are over, and
 * ends with the last of them; with none over but today, it shows today,
 * marked `inProgress`.
 */
export function buildDataGraph(
  dashboard: DashboardDay[],
  from: string,
  to: string,
  grain: Grain,
  today = toDateKey(new Date()),
): DataGraph[] {
  const byDay = new Map(dashboard.map((day) => [day.day, day]));

  return groupDays(from, to, grain).map((group) => {
    const over = group.filter((day) => day < today);
    const inProgress = over.length === 0 && group.includes(today);
    const counted = over.length === 0 ? group : over;
    const chunk = counted.flatMap((day) => byDay.get(day) ?? []);
    return {
      from: shortDate(group[0]),
      date: shortDate(counted[counted.length - 1]),
      inProgress,
      loggedDays: chunk.filter((day) => day.totalKcal !== null).length,
      kcal: averageOf(chunk, 'totalKcal'),
      protein: averageOf(chunk, 'totalProtein'),
      carbs: averageOf(chunk, 'totalCarbs'),
      fat: averageOf(chunk, 'totalFat'),
    };
  });
}
