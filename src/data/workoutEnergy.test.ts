import { describe, expect, it } from 'vitest';

import type { Workout, WorkoutItem } from '../components/fitness/types';
import {
  estimateWorkoutKcal,
  netMetKcal,
  treadmillKcal,
  weightOn,
} from './workoutEnergy';

const item = (values: Partial<WorkoutItem>): WorkoutItem => ({
  id: 1,
  exerciseId: 1,
  exerciseName: 'Exercice',
  kind: 'STRENGTH',
  met: null,
  sets: [],
  durationMinutes: null,
  speedKmh: null,
  inclinePercent: null,
  ...values,
});

const workout = (
  durationMinutes: number | null,
  ...items: WorkoutItem[]
): Workout => ({ id: 1, performedOn: '2026-11-05', durationMinutes, items });

const PRESS = item({ kind: 'STRENGTH', sets: [{ reps: 10, weightKg: 80 }] });
const INCLINE_WALK = item({
  kind: 'TREADMILL',
  durationMinutes: 20,
  speedKmh: 5,
  inclinePercent: 12,
});
const ROWER = item({ kind: 'CARDIO', met: 7, durationMinutes: 10 });

describe('netMetKcal', () => {
  it('counts the effort above rest only', () => {
    // 3.5 METs for an hour at 80 kg: 280 kcal, of which 80 at rest.
    expect(netMetKcal(3.5, 80, 60)).toBe(200);
  });

  it('gives nothing for an effort at rest', () => {
    expect(netMetKcal(1, 80, 60)).toBe(0);
  });
});

describe('treadmillKcal', () => {
  it('uses the walking equation below 8 km/h', () => {
    // 83.3 m/min: 8.33 + 1.8 x 83.3 x 0.12 = 26.3 ml/kg/min above rest.
    expect(treadmillKcal(5, 12, 80, 20)).toBeCloseTo(210.7, 1);
  });

  it('uses the running equation from 8 km/h', () => {
    // 166.7 m/min flat: 0.2 x 166.7 = 33.3 ml/kg/min above rest.
    expect(treadmillKcal(10, 0, 70, 30)).toBeCloseTo(350, 0);
  });

  it('costs more uphill', () => {
    expect(treadmillKcal(5, 10, 80, 30)).toBeGreaterThan(
      treadmillKcal(5, 0, 80, 30),
    );
  });
});

describe('estimateWorkoutKcal', () => {
  it('adds the cardio and gives strength the rest of the session', () => {
    // Treadmill 210.7 + rower 6 x 80 x 10 / 60 = 80 + strength 30 min = 100.
    expect(
      estimateWorkoutKcal(workout(60, PRESS, INCLINE_WALK, ROWER), 80),
    ).toEqual({ kcal: 391, isPartial: false });
  });

  it('counts only the cardio of a session without duration', () => {
    expect(estimateWorkoutKcal(workout(null, PRESS, ROWER), 80)).toEqual({
      kcal: 80,
      isPartial: true,
    });
  });

  it('is complete for a cardio session without duration', () => {
    expect(estimateWorkoutKcal(workout(null, ROWER), 80)).toEqual({
      kcal: 80,
      isPartial: false,
    });
  });

  it('gives strength nothing when the cardio fills the session', () => {
    expect(estimateWorkoutKcal(workout(20, PRESS, INCLINE_WALK), 80)).toEqual({
      kcal: 211,
      isPartial: false,
    });
  });
});

describe('weightOn', () => {
  const WEIGH_INS = [
    { weight: 76, loggedAt: new Date(2026, 10, 5, 7).toISOString() },
    { weight: 77, loggedAt: new Date(2026, 10, 1, 7).toISOString() },
  ];

  it('takes the last weigh-in of the day or before', () => {
    expect(weightOn(WEIGH_INS, '2026-11-04')).toBe(77);
    expect(weightOn(WEIGH_INS, '2026-11-05')).toBe(76);
  });

  it('takes the first weigh-in after a day before them all', () => {
    expect(weightOn(WEIGH_INS, '2026-10-20')).toBe(77);
  });

  it('gives nothing without any weigh-in', () => {
    expect(weightOn([], '2026-11-05')).toBeNull();
  });
});
