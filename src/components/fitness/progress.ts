import { startOfDay, toDateKey } from '../../utils/dateKey';
import type { Workout, WorkoutItem, WorkoutSet } from './types';

export interface TrainingSummary {
  sessions: number;
  /** Repetitions times load, over every strength set (kg). */
  volumeKg: number;
  /** Minutes of cardio. */
  cardioMinutes: number;
  /** Walked or run on the treadmill. */
  distanceKm: number;
  /** Climbed on the treadmill, from its slope. */
  climbMeters: number;
}

/** The weight lifted over a set: repetitions times load. */
const volumeOf = (sets: readonly WorkoutSet[]) =>
  sets.reduce((sum, { reps, weightKg }) => sum + reps * weightKg, 0);

/** The minutes of a cardio line, all its sets added up. */
export const cardioMinutes = (item: WorkoutItem) =>
  item.cardioSets.reduce((sum, set) => sum + set.durationMinutes, 0);

/** The kilometers of a treadmill line: speed times duration, set by set. */
export function treadmillKm(item: WorkoutItem) {
  if (item.kind !== 'TREADMILL') return 0;
  return item.cardioSets.reduce(
    (sum, set) => sum + ((set.speedKmh ?? 0) * set.durationMinutes) / 60,
    0,
  );
}

/** The meters climbed on a treadmill line: each set's distance by its slope. */
export function treadmillClimb(item: WorkoutItem) {
  if (item.kind !== 'TREADMILL') return 0;
  return item.cardioSets.reduce(
    (sum, set) =>
      sum +
      (((set.speedKmh ?? 0) * set.durationMinutes) / 60) *
        1000 *
        ((set.inclinePercent ?? 0) / 100),
    0,
  );
}

/** How much training a list of sessions holds. */
export function summarizeWorkouts(
  workouts: readonly Workout[],
): TrainingSummary {
  const items = workouts.flatMap((workout) => workout.items);
  return {
    sessions: workouts.length,
    volumeKg: items.reduce((sum, item) => sum + volumeOf(item.sets), 0),
    cardioMinutes: items.reduce((sum, item) => sum + cardioMinutes(item), 0),
    distanceKm: items.reduce((sum, item) => sum + treadmillKm(item), 0),
    climbMeters: items.reduce((sum, item) => sum + treadmillClimb(item), 0),
  };
}

/** The strength exercises done in the sessions, sorted by name. */
export function strengthExercisesOf(workouts: readonly Workout[]) {
  const byId = new Map<number, string>();
  for (const workout of workouts) {
    for (const item of workout.items) {
      if (item.kind === 'STRENGTH')
        byId.set(item.exerciseId, item.exerciseName);
    }
  }
  return [...byId]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    );
}

/**
 * The load a set suggests could be lifted once (Epley's formula). Only used
 * to rank sets, 12 × 80 kg against 8 × 85 kg, never shown: it reads low on
 * sets not taken to failure.
 */
export function oneRepMax({ reps, weightKg }: WorkoutSet) {
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

/**
 * How a strength exercise is followed over time: the heaviest load of the
 * day, or the volume (repetitions × load).
 */
export type ProgressMetric = 'max' | 'volume';

/** The value of each day an exercise was done, oldest first. */
export function strengthProgress(
  workouts: readonly Workout[],
  exerciseId: number,
  metric: ProgressMetric = 'max',
) {
  const byDay = new Map<string, number>();
  for (const workout of workouts) {
    for (const item of workout.items) {
      if (item.exerciseId !== exerciseId || item.sets.length === 0) continue;
      const current = byDay.get(workout.performedOn);
      if (metric === 'volume') {
        byDay.set(workout.performedOn, (current ?? 0) + volumeOf(item.sets));
        continue;
      }
      const best = Math.max(...item.sets.map(({ weightKg }) => weightKg));
      byDay.set(
        workout.performedOn,
        current === undefined ? best : Math.max(current, best),
      );
    }
  }
  return [...byDay]
    .map(([day, value]) => ({ day, value: Math.round(value * 10) / 10 }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export interface WeekSessions {
  /** The Monday of the week (YYYY-MM-DD). */
  weekStart: string;
  /** Sessions with some strength. */
  strength: number;
  /** Sessions of cardio only. */
  cardio: number;
}

/** The Monday of the week of a day. */
function mondayOf(day: string) {
  const date = startOfDay(day);
  const fromMonday = (date.getDay() + 6) % 7;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - fromMonday,
  );
}

/**
 * The sessions of each week (Monday to Sunday) from the week of `from` to
 * the week of `to`, the empty weeks included.
 */
export function weeklySessions(
  workouts: readonly Workout[],
  from: string,
  to: string,
): WeekSessions[] {
  const weeks: WeekSessions[] = [];
  const last = mondayOf(to);
  for (
    let monday = mondayOf(from);
    monday <= last;
    monday = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + 7,
    )
  ) {
    weeks.push({ weekStart: toDateKey(monday), strength: 0, cardio: 0 });
  }
  for (const workout of workouts) {
    const week = weeks.find(
      ({ weekStart }) => weekStart === toDateKey(mondayOf(workout.performedOn)),
    );
    if (!week) continue;
    if (workout.items.some(({ kind }) => kind === 'STRENGTH')) {
      week.strength += 1;
    } else {
      week.cardio += 1;
    }
  }
  return weeks;
}
