import { describe, expect, it } from 'vitest';

import {
  strengthExercisesOf,
  strengthProgress,
  summarizeWorkouts,
} from './progress';
import type { Workout, WorkoutItem } from './types';

const press = (...weights: number[]): WorkoutItem => ({
  id: 1,
  exerciseId: 1,
  exerciseName: 'Presse à cuisses',
  kind: 'STRENGTH',
  met: null,
  sets: weights.map((weightKg) => ({ reps: 10, weightKg })),
  durationMinutes: null,
  speedKmh: null,
  inclinePercent: null,
});

const ROWER: WorkoutItem = {
  ...press(),
  exerciseId: 3,
  exerciseName: 'Rameur',
  kind: 'CARDIO',
  met: 7,
  durationMinutes: 10,
};

const CURL: WorkoutItem = {
  ...press(30),
  exerciseId: 2,
  exerciseName: 'Curl biceps machine',
};

const session = (
  performedOn: string,
  durationMinutes: number | null,
  ...items: WorkoutItem[]
): Workout => ({ id: 1, performedOn, name: null, durationMinutes, items });

describe('summarizeWorkouts', () => {
  it('counts the sessions and the minutes of those with a duration', () => {
    expect(
      summarizeWorkouts([
        session('2026-11-03', 45, press(80)),
        session('2026-11-05', null, ROWER),
      ]),
    ).toEqual({ sessions: 2, minutes: 45 });
  });
});

describe('strengthExercisesOf', () => {
  it('lists each strength exercise once, sorted by name', () => {
    expect(
      strengthExercisesOf([
        session('2026-11-03', 45, press(80), ROWER),
        session('2026-11-05', 45, CURL, press(85)),
      ]),
    ).toEqual([
      { id: 2, name: 'Curl biceps machine' },
      { id: 1, name: 'Presse à cuisses' },
    ]);
  });
});

describe('strengthProgress', () => {
  it('gives the heaviest load of each day, oldest first', () => {
    expect(
      strengthProgress(
        [
          session('2026-11-05', 45, press(80, 90, 85)),
          session('2026-11-01', 45, press(70, 75)),
          session('2026-11-05', 30, press(95)),
          session('2026-11-03', 45, CURL),
        ],
        1,
      ),
    ).toEqual([
      { day: '2026-11-01', maxWeightKg: 75 },
      { day: '2026-11-05', maxWeightKg: 95 },
    ]);
  });

  it('gives nothing for an exercise not done', () => {
    expect(strengthProgress([session('2026-11-03', 45, CURL)], 1)).toEqual([]);
  });
});
