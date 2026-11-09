import { describe, expect, it } from 'vitest';

import {
  cardioMinutes,
  oneRepMax,
  strengthExercisesOf,
  strengthProgress,
  summarizeWorkouts,
  treadmillClimb,
  treadmillKm,
  weeklySessions,
} from './progress';
import type { Workout, WorkoutItem } from './types';

const press = (...sets: [number, number][]): WorkoutItem => ({
  id: 1,
  exerciseId: 1,
  exerciseName: 'Presse à cuisses',
  kind: 'STRENGTH',
  sets: sets.map(([reps, weightKg]) => ({ reps, weightKg })),
  cardioSets: [],
});

const cardio = (
  durationMinutes: number,
  speedKmh: number | null = null,
  inclinePercent: number | null = null,
) => ({ durationMinutes, speedKmh, inclinePercent, resistance: null });

/** 15 min at 4 km/h and 0 %, then 30 min at 4 km/h and 15 %: 3 km, 300 m. */
const WALK: WorkoutItem = {
  ...press(),
  exerciseId: 2,
  exerciseName: 'Tapis de course',
  kind: 'TREADMILL',
  cardioSets: [cardio(15, 4, 0), cardio(30, 4, 15)],
};

const ROWER: WorkoutItem = {
  ...press(),
  exerciseId: 3,
  exerciseName: 'Rameur',
  kind: 'CARDIO',
  cardioSets: [cardio(10)],
};

const CURL: WorkoutItem = {
  ...press([10, 30]),
  exerciseId: 4,
  exerciseName: 'Curl biceps machine',
};

const session = (performedOn: string, ...items: WorkoutItem[]): Workout => ({
  id: 1,
  performedOn,
  items,
});

describe('treadmill', () => {
  it('adds up the distance and the climb of each set', () => {
    expect(cardioMinutes(WALK)).toBe(45);
    expect(treadmillKm(WALK)).toBe(3);
    expect(treadmillClimb(WALK)).toBeCloseTo(300);
  });

  it('gives no distance nor climb for another exercise', () => {
    expect(treadmillKm(ROWER)).toBe(0);
    expect(treadmillClimb(ROWER)).toBe(0);
  });
});

describe('summarizeWorkouts', () => {
  it('sums up the sessions, their volume and their cardio', () => {
    expect(
      summarizeWorkouts([
        session('2026-11-03', press([12, 100], [10, 110])),
        session('2026-11-05', WALK, ROWER),
      ]),
    ).toEqual({
      sessions: 2,
      volumeKg: 2300,
      cardioMinutes: 55,
      distanceKm: 3,
      climbMeters: 300,
    });
  });
});

describe('strengthExercisesOf', () => {
  it('lists each strength exercise once, sorted by name', () => {
    expect(
      strengthExercisesOf([
        session('2026-11-03', press([10, 80]), ROWER),
        session('2026-11-05', CURL, press([10, 85])),
      ]),
    ).toEqual([
      { id: 4, name: 'Curl biceps machine' },
      { id: 1, name: 'Presse à cuisses' },
    ]);
  });
});

describe('oneRepMax', () => {
  it('estimates the load of a single repetition', () => {
    expect(oneRepMax({ reps: 10, weightKg: 90 })).toBe(120);
    expect(oneRepMax({ reps: 1, weightKg: 130 })).toBe(130);
  });
});

describe('strengthProgress', () => {
  const WORKOUTS = [
    session('2026-11-05', press([12, 80], [10, 90], [8, 85])),
    session('2026-11-01', press([10, 70], [8, 75])),
    session('2026-11-05', press([1, 95])),
    session('2026-11-03', CURL),
  ];

  it('gives the heaviest load of each day, oldest first', () => {
    expect(strengthProgress(WORKOUTS, 1)).toEqual([
      { day: '2026-11-01', value: 75 },
      { day: '2026-11-05', value: 95 },
    ]);
  });

  it('gives the best estimated one-rep max of each day', () => {
    // 10 × 90 = 120 beats 1 × 95 and 12 × 80 = 112.
    expect(strengthProgress(WORKOUTS, 1, 'oneRepMax')).toEqual([
      { day: '2026-11-01', value: 95 },
      { day: '2026-11-05', value: 120 },
    ]);
  });

  it('adds up the volume of each day', () => {
    expect(strengthProgress(WORKOUTS, 1, 'volume')).toEqual([
      { day: '2026-11-01', value: 1300 },
      { day: '2026-11-05', value: 2635 },
    ]);
  });

  it('gives nothing for an exercise not done', () => {
    expect(strengthProgress([session('2026-11-03', CURL)], 1)).toEqual([]);
  });
});

describe('weeklySessions', () => {
  it('counts the sessions of each week, Monday first, empty weeks included', () => {
    expect(
      weeklySessions(
        [
          session('2026-11-02', press([10, 80])),
          session('2026-11-04', WALK),
          session('2026-11-08', WALK, press([10, 80])),
          session('2026-10-20', ROWER),
        ],
        '2026-10-21',
        '2026-11-08',
      ),
    ).toEqual([
      { weekStart: '2026-10-19', strength: 0, cardio: 1 },
      { weekStart: '2026-10-26', strength: 0, cardio: 0 },
      { weekStart: '2026-11-02', strength: 2, cardio: 1 },
    ]);
  });

  it('leaves out the sessions outside the weeks', () => {
    expect(
      weeklySessions([session('2026-11-20', WALK)], '2026-11-02', '2026-11-08'),
    ).toEqual([{ weekStart: '2026-11-02', strength: 0, cardio: 0 }]);
  });
});
