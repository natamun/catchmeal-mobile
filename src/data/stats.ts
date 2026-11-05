import type { DashboardDay } from '../components/analytics/types';
import type { Executor } from '../db/database';
import { endOfDay, startOfDay, toDateKey } from '../utils/dateKey';
import { checkDateOnly } from './validation';

interface TotalsRow {
  day: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface WeightRow {
  weight: number;
  body_fat: number | null;
  fat_free_mass: number | null;
  body_water: number | null;
  muscle_mass: number | null;
  logged_at: string;
}

interface GoalRow {
  daily_calories: number;
  objective: string | null;
  start_date: string;
}

const GOAL_COLUMNS = 'daily_calories, objective, start_date';

/**
 * One entry per day from `from` to `to` (YYYY-MM-DD, both included) that has
 * a meal, a weigh-in or a new goal, the oldest first:
 * - the day's calories and macros, rounded, or null without any logged meal;
 * - the last weigh-in of the day, or null;
 * - the calorie goal in force at the end of the day and its objective, which
 *   may come from a goal set before the period.
 *
 * Weigh-ins and goals keep their exact moment; their day is the local one, so
 * a weigh-in at 00:30 counts for the day that just started.
 */
export async function getDashboard(
  db: Executor,
  from: string,
  to: string,
): Promise<DashboardDay[]> {
  checkDateOnly(from, 'début de la période');
  checkDateOnly(to, 'fin de la période');
  const periodStart = startOfDay(from).toISOString();
  const periodEnd = endOfDay(to).toISOString();

  const totals = await db.query<TotalsRow>(
    `SELECT m.logged_at AS day, sum(i.kcal) AS kcal, sum(i.protein) AS protein,
            sum(i.carbs) AS carbs, sum(i.fat) AS fat
     FROM meal m JOIN meal_item i ON i.meal_id = m.id
     WHERE m.logged_at BETWEEN ? AND ?
     GROUP BY m.logged_at`,
    [from, to],
  );
  const weights = await db.query<WeightRow>(
    `SELECT weight, body_fat, fat_free_mass, body_water, muscle_mass, logged_at
     FROM weight_log WHERE logged_at >= ? AND logged_at < ?
     ORDER BY logged_at, id`,
    [periodStart, periodEnd],
  );
  const goals = await db.query<GoalRow>(
    `SELECT ${GOAL_COLUMNS} FROM goal_setting
     WHERE start_date >= ? AND start_date < ? ORDER BY start_date, id`,
    [periodStart, periodEnd],
  );
  const [previousGoal] = await db.query<GoalRow>(
    `SELECT ${GOAL_COLUMNS} FROM goal_setting
     WHERE start_date < ? ORDER BY start_date DESC, id DESC LIMIT 1`,
    [periodStart],
  );

  const totalsByDay = new Map(totals.map((row) => [row.day, row]));
  // Ordered by time: the last weigh-in of a day overwrites the earlier ones.
  const weightByDay = new Map(
    weights.map((row) => [toDateKey(new Date(row.logged_at)), row]),
  );
  const goalDays = goals.map((goal) => toDateKey(new Date(goal.start_date)));

  const goalAt = (day: string) => {
    const end = endOfDay(day).toISOString();
    return (
      goals.filter((goal) => goal.start_date < end).at(-1) ??
      previousGoal ??
      null
    );
  };

  const days = [
    ...new Set([...totalsByDay.keys(), ...weightByDay.keys(), ...goalDays]),
  ].sort();

  return days.map((day) => {
    const total = totalsByDay.get(day);
    const weight = weightByDay.get(day);
    const goal = goalAt(day);
    return {
      day,
      totalKcal: total ? Math.round(total.kcal) : null,
      totalProtein: total ? Math.round(total.protein) : null,
      totalCarbs: total ? Math.round(total.carbs) : null,
      totalFat: total ? Math.round(total.fat) : null,
      weight: weight?.weight ?? null,
      bodyFat: weight?.body_fat ?? null,
      fatFreeMass: weight?.fat_free_mass ?? null,
      bodyWater: weight?.body_water ?? null,
      muscleMass: weight?.muscle_mass ?? null,
      goalKcal: goal?.daily_calories ?? null,
      objective: goal?.objective ?? null,
    };
  });
}
