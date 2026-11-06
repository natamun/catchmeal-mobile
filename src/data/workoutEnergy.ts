import type { Workout } from '../components/fitness/types';
import { toDateKey } from '../utils/dateKey';
import { DEFAULT_CARDIO_MET } from './exercises';

/**
 * Resistance training, several exercises of 8 to 15 repetitions, in the
 * Compendium of Physical Activities.
 */
export const STRENGTH_MET = 3.5;
/** Rest is 1 MET: the body spends it anyway, it is already in the BMR. */
const REST_MET = 1;
/** Calories per liter of oxygen the body uses, the usual round value. */
const KCAL_PER_LITER_OF_OXYGEN = 5;
/** From this speed the ACSM running equation replaces the walking one. */
const RUNNING_FROM_KMH = 8;

/** Calories spent above rest by an effort of `met` during `minutes`. */
export function netMetKcal(met: number, weightKg: number, minutes: number) {
  return (Math.max(0, met - REST_MET) * weightKg * minutes) / 60;
}

/**
 * Calories spent above rest walking or running on a treadmill, with the
 * metabolic equations of the American College of Sports Medicine: oxygen per
 * kg and minute = horizontal part + vertical part (+ 3.5 at rest, left out).
 */
export function treadmillKcal(
  speedKmh: number,
  inclinePercent: number,
  weightKg: number,
  minutes: number,
) {
  const metersPerMinute = (speedKmh * 1000) / 60;
  const grade = inclinePercent / 100;
  const oxygen =
    speedKmh >= RUNNING_FROM_KMH
      ? 0.2 * metersPerMinute + 0.9 * metersPerMinute * grade
      : 0.1 * metersPerMinute + 1.8 * metersPerMinute * grade;
  return ((oxygen * weightKg) / 1000) * KCAL_PER_LITER_OF_OXYGEN * minutes;
}

export interface WorkoutEnergy {
  kcal: number;
  /**
   * True when the session has strength exercises but no duration: only its
   * cardio could be counted.
   */
  isPartial: boolean;
}

/**
 * Estimated calories of a session above rest, rounded. Cardio counts its own
 * minutes (the treadmill from its speed and incline); strength gets the rest
 * of the session's duration, at 3.5 METs.
 */
export function estimateWorkoutKcal(
  workout: Workout,
  weightKg: number,
): WorkoutEnergy {
  let kcal = 0;
  let cardioMinutes = 0;
  for (const item of workout.items) {
    if (item.kind === 'STRENGTH' || item.durationMinutes === null) continue;
    cardioMinutes += item.durationMinutes;
    kcal +=
      item.kind === 'TREADMILL'
        ? treadmillKcal(
            item.speedKmh ?? 0,
            item.inclinePercent ?? 0,
            weightKg,
            item.durationMinutes,
          )
        : netMetKcal(
            item.met ?? DEFAULT_CARDIO_MET,
            weightKg,
            item.durationMinutes,
          );
  }

  const hasStrength = workout.items.some(({ kind }) => kind === 'STRENGTH');
  if (hasStrength && workout.durationMinutes === null) {
    return { kcal: Math.round(kcal), isPartial: true };
  }
  if (hasStrength && workout.durationMinutes !== null) {
    const strengthMinutes = Math.max(
      0,
      workout.durationMinutes - cardioMinutes,
    );
    kcal += netMetKcal(STRENGTH_MET, weightKg, strengthMinutes);
  }
  return { kcal: Math.round(kcal), isPartial: false };
}

/**
 * The weight on a day: the last weigh-in of that day or before, or else the
 * first one after. Null without any weigh-in.
 */
export function weightOn(
  weighIns: readonly { weight: number; loggedAt: string }[],
  day: string,
) {
  const byDay = weighIns
    .map(({ weight, loggedAt }) => ({
      weight,
      day: toDateKey(new Date(loggedAt)),
      loggedAt,
    }))
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const before = byDay.filter((weighIn) => weighIn.day <= day).at(-1);
  return (before ?? byDay[0])?.weight ?? null;
}
