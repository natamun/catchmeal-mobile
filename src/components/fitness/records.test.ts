import { describe, expect, it } from 'vitest';

import {
  exerciseHistory,
  latestItems,
  newRecords,
  strengthRecord,
} from './records';
import type { Workout, WorkoutItem } from './types';

const press = (...sets: [number, number][]): WorkoutItem => ({
  id: 1,
  exerciseId: 1,
  exerciseName: 'Presse à cuisses',
  kind: 'STRENGTH',
  sets: sets.map(([reps, weightKg]) => ({ reps, weightKg })),
  durationMinutes: null,
  speedKmh: null,
  inclinePercent: null,
});

const CURL: WorkoutItem = { ...press([10, 30]), exerciseId: 2 };

const session = (
  id: number,
  performedOn: string,
  ...items: WorkoutItem[]
): Workout => ({ id, performedOn, items });

const HISTORY = [
  session(3, '2026-11-05', press([12, 100], [10, 110])),
  session(1, '2026-10-29', press([10, 105], [8, 110])),
  session(2, '2026-11-01', CURL),
];

describe('exerciseHistory', () => {
  it('gives every time the exercise was done, the newest first', () => {
    expect(
      exerciseHistory(HISTORY, 1).map(({ day, workoutId }) => [day, workoutId]),
    ).toEqual([
      ['2026-11-05', 3],
      ['2026-10-29', 1],
    ]);
  });
});

describe('latestItems', () => {
  it('keeps the newest line of each exercise', () => {
    const latest = latestItems(HISTORY);

    expect(latest.get(1)?.sets).toEqual([
      { reps: 12, weightKg: 100 },
      { reps: 10, weightKg: 110 },
    ]);
    expect(latest.get(2)?.sets).toEqual([{ reps: 10, weightKg: 30 }]);
    expect(latest.has(9)).toBe(false);
  });
});

describe('strengthRecord', () => {
  it('keeps the first day the heaviest load and the best 1RM were reached', () => {
    // 110 kg was lifted on 29/10 first; 10 × 110 = 146.7 beats 10 × 105 = 140;
    // 12 × 100 + 10 × 110 = 2300 kg beats 10 × 105 + 8 × 110 = 1930 kg.
    expect(strengthRecord(HISTORY, 1)).toEqual({
      weightKg: 110,
      day: '2026-10-29',
      oneRepMax: 146.7,
      oneRepMaxDay: '2026-11-05',
      volumeKg: 2300,
      volumeDay: '2026-11-05',
    });
  });

  it('gives nothing for an exercise never done', () => {
    expect(strengthRecord(HISTORY, 9)).toBeNull();
  });
});

describe('newRecords', () => {
  it('finds the exercises that beat their heaviest load', () => {
    expect(
      newRecords(HISTORY, [
        { exerciseId: 1, sets: [{ reps: 6, weightKg: 115 }] },
        { exerciseId: 2, sets: [{ reps: 12, weightKg: 30 }] },
      ]),
    ).toEqual([{ exerciseId: 1, weightKg: 115 }]);
  });

  it('sets no record on a first time or an equal load', () => {
    expect(
      newRecords(HISTORY, [
        { exerciseId: 9, sets: [{ reps: 10, weightKg: 50 }] },
        { exerciseId: 1, sets: [{ reps: 10, weightKg: 110 }] },
      ]),
    ).toEqual([]);
  });

  it('leaves out the session being edited', () => {
    expect(
      newRecords(
        HISTORY,
        [{ exerciseId: 1, sets: [{ reps: 10, weightKg: 110 }] }],
        1,
      ),
    ).toEqual([]);
    expect(
      newRecords(
        [session(1, '2026-10-29', press([10, 120]))],
        [{ exerciseId: 1, sets: [{ reps: 10, weightKg: 120 }] }],
        1,
      ),
    ).toEqual([]);
  });

  it('ignores cardio lines', () => {
    expect(
      newRecords(HISTORY, [{ exerciseId: 1, durationMinutes: 20 }]),
    ).toEqual([]);
  });
});
