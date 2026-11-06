import { slopePerDay } from '../utils/trend';
import type { GoalType } from './goals';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A weigh-in, with what the scale told of the body composition. */
export interface CompositionEntry {
  weight: number;
  bodyFat: number | null;
  fatFreeMass: number | null;
  /** The moment of the weigh-in, as an ISO string. */
  loggedAt: string;
}

/**
 * Fat-free mass of a weigh-in: the measured value, else deduced from the weight
 * and the body fat percentage (weight x (1 - fat / 100)). Null when neither is
 * known.
 */
export function fatFreeMassOf(
  entry: Pick<CompositionEntry, 'weight' | 'bodyFat' | 'fatFreeMass'>,
): number | null {
  if (entry.fatFreeMass !== null) return entry.fatFreeMass;
  if (entry.bodyFat !== null) return entry.weight * (1 - entry.bodyFat / 100);
  return null;
}

/** The latest weigh-in that tells the fat-free mass, or null. */
export function latestComposition<T extends CompositionEntry>(
  entries: readonly T[],
): T | null {
  return (
    [...entries]
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
      .find((entry) => fatFreeMassOf(entry) !== null) ?? null
  );
}

/**
 * The weight at which the body would hold the target share of fat, keeping
 * its fat-free mass: fat-free mass / (1 - target / 100), to 0.1 kg.
 */
export function targetWeightFor(fatFreeMass: number, targetBodyFat: number) {
  return Math.round((fatFreeMass / (1 - targetBodyFat / 100)) * 10) / 10;
}

/**
 * The weight to aim at: deduced from the target body fat when there is one
 * and the fat-free mass is known, so muscle gained raises it; the target
 * weight typed otherwise.
 */
export function effectiveTargetWeight(
  goal: { targetWeight: number | null; targetBodyFat: number | null },
  fatFreeMass: number | null,
) {
  return goal.targetBodyFat !== null && fatFreeMass !== null
    ? targetWeightFor(fatFreeMass, goal.targetBodyFat)
    : goal.targetWeight;
}

/** How the fat and the fat-free mass moved over a run of weigh-ins. */
export interface CompositionChange {
  /** Kg gained along the trend, negative when lost. */
  fatKg: number;
  leanKg: number;
  /** The first weigh-in read, as an ISO string, and the days to the last. */
  since: string;
  days: number;
  weighIns: number;
}

interface ChangeOptions {
  /** The weigh-ins read, both moments included. */
  from?: Date;
  to?: Date;
  /** Below these, the noise of the scale hides the trend. */
  minWeighIns?: number;
  minDays?: number;
}

/**
 * The fat and fat-free mass gained or lost over the weigh-ins that tell
 * them, read on their trend (least squares) rather than from the first to
 * the last: a scale is off by a few points from one day to the next. Null
 * with too few weigh-ins, 3 over 14 days by default.
 */
export function compositionChange(
  entries: readonly CompositionEntry[],
  { from, to, minWeighIns = 3, minDays = 14 }: ChangeOptions = {},
): CompositionChange | null {
  const measured = entries
    .flatMap((entry) => {
      const time = Date.parse(entry.loggedAt);
      const lean = fatFreeMassOf(entry);
      if (lean === null) return [];
      if (from && time < from.getTime()) return [];
      if (to && time > to.getTime()) return [];
      return [{ time, lean, fat: entry.weight - lean, at: entry.loggedAt }];
    })
    .sort((a, b) => a.time - b.time);
  if (measured.length < minWeighIns) return null;

  const first = measured[0].time;
  const days = (measured.at(-1)!.time - first) / DAY_MS;
  if (days < minDays) return null;
  const along = (key: 'fat' | 'lean') =>
    slopePerDay(
      measured.map((m) => ({ day: (m.time - first) / DAY_MS, value: m[key] })),
    ) * days;

  return {
    fatKg: along('fat'),
    leanKg: along('lean'),
    since: measured[0].at,
    days: Math.round(days),
    weighIns: measured.length,
  };
}

export type CompositionAlert = 'FAT_GAIN' | 'LEAN_LOSS';

/** The alert reads the last six weeks of the goal, four of them at least. */
const ALERT_WINDOW_DAYS = 42;
const ALERT_MIN_DAYS = 28;
const ALERT_MIN_WEIGH_INS = 4;
/** A smaller change is the noise of the scale. */
const NOISE_KG = 0.5;

interface AlertOptions {
  goalType: GoalType;
  /** When the current goal began, or null. */
  goalStart: Date | null;
  /** The user can turn off the alert about the fat-free mass lost. */
  warnLeanLoss: boolean;
}

/**
 * Whether the body composition goes against the goal over its last weeks:
 * while building muscle, the fat rising faster than the fat-free mass; while
 * losing, the fat-free mass falling for more than a third of the loss, or
 * while the weight holds. Null when it goes well or there is too little to
 * tell.
 */
export function compositionAlert(
  entries: readonly CompositionEntry[],
  { goalType, goalStart, warnLeanLoss }: AlertOptions,
  today = new Date(),
): CompositionAlert | null {
  const windowStart = new Date(today.getTime() - ALERT_WINDOW_DAYS * DAY_MS);
  const change = compositionChange(entries, {
    from: goalStart && goalStart > windowStart ? goalStart : windowStart,
    minWeighIns: ALERT_MIN_WEIGH_INS,
    minDays: ALERT_MIN_DAYS,
  });
  if (!change) return null;
  const { fatKg, leanKg } = change;

  if (goalType === 'GAIN_MUSCLE') {
    return fatKg >= NOISE_KG && fatKg > leanKg ? 'FAT_GAIN' : null;
  }
  if (warnLeanLoss && (goalType === 'LOSE_FAT' || goalType === 'LOSE_WEIGHT')) {
    const lost = -(fatKg + leanKg);
    return -leanKg >= NOISE_KG && (lost <= 0 || -leanKg > lost / 3)
      ? 'LEAN_LOSS'
      : null;
  }
  return null;
}
