import { beforeEach, describe, expect, it } from 'vitest';

import type { WorkoutItemInput } from '../components/fitness/types';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { addTestExercises } from '../test/exercises';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { DataError } from './errors';
import { archiveExercise, createExercise } from './exercises';
import {
  addToDay,
  getDay,
  lastPerformance,
  listWorkouts,
  saveDay,
} from './workouts';

let db: Database;
let press: number;
let curl: number;
let treadmill: number;
let rower: number;

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
  ({ press, curl, treadmill, rower } = await addTestExercises(db));
});

const strength = (
  exerciseId: number,
  ...sets: [number, number][]
): WorkoutItemInput => ({
  exerciseId,
  sets: sets.map(([reps, weightKg]) => ({ reps, weightKg })),
});

const walk = (values: Partial<WorkoutItemInput> = {}): WorkoutItemInput => ({
  exerciseId: treadmill,
  durationMinutes: 20,
  speedKmh: 5,
  inclinePercent: 12,
  ...values,
});

const LEG_DAY = () => [
  strength(press, [8, 100], [10, 90], [12, 80]),
  walk(),
  { exerciseId: rower, durationMinutes: 10 },
];

describe('addToDay', () => {
  it('starts the session of the day with the exercises in order', async () => {
    const day = await addToDay(db, '2026-11-05', LEG_DAY());

    expect(day).toMatchObject({
      performedOn: '2026-11-05',
      items: [
        {
          exerciseId: press,
          exerciseName: 'Presse à cuisses',
          kind: 'STRENGTH',
          sets: [
            { reps: 8, weightKg: 100 },
            { reps: 10, weightKg: 90 },
            { reps: 12, weightKg: 80 },
          ],
          durationMinutes: null,
        },
        {
          kind: 'TREADMILL',
          sets: [],
          durationMinutes: 20,
          speedKmh: 5,
          inclinePercent: 12,
        },
        { kind: 'CARDIO', durationMinutes: 10, speedKmh: null },
      ],
    });
  });

  it('adds new exercises after those of the day, in one session', async () => {
    await addToDay(db, '2026-11-05', [strength(press, [8, 100])]);

    const day = await addToDay(db, '2026-11-05', [strength(curl, [12, 40])]);

    expect(day.items.map(({ exerciseId }) => exerciseId)).toEqual([
      press,
      curl,
    ]);
    expect(await listWorkouts(db)).toHaveLength(1);
  });

  it('leaves an exercise the day already holds as it is', async () => {
    await addToDay(db, '2026-11-05', [strength(press, [8, 100])]);

    const day = await addToDay(db, '2026-11-05', [
      strength(press, [12, 60]),
      strength(curl, [12, 40]),
      strength(curl, [10, 45]),
    ]);

    expect(day.items).toMatchObject([
      { exerciseId: press, sets: [{ reps: 8, weightKg: 100 }] },
      { exerciseId: curl, sets: [{ reps: 12, weightKg: 40 }] },
    ]);
  });

  it('keeps only the fields of each kind', async () => {
    const day = await addToDay(db, '2026-11-05', [
      { ...strength(press, [8, 100]), durationMinutes: 5, speedKmh: 3 },
      {
        exerciseId: rower,
        durationMinutes: 10,
        speedKmh: 12,
        sets: [{ reps: 1, weightKg: 1 }],
      },
    ]);

    expect(day.items[0]).toMatchObject({
      durationMinutes: null,
      speedKmh: null,
    });
    expect(day.items[1]).toMatchObject({ sets: [], speedKmh: null });
  });

  it('counts a treadmill without incline as flat, and a set at body weight', async () => {
    const day = await addToDay(db, '2026-11-05', [
      walk({ inclinePercent: null }),
      strength(curl, [15, 0]),
    ]);

    expect(day.items[0].inclinePercent).toBe(0);
    expect(day.items[1].sets).toEqual([{ reps: 15, weightKg: 0 }]);
  });

  it.each<[string, string, () => WorkoutItemInput[]]>([
    ['a badly written day', '05/11/2026', () => [strength(press, [8, 100])]],
    ['no exercise', '2026-11-05', () => []],
    ['a strength exercise without sets', '2026-11-05', () => [strength(press)]],
    ['a set of 0 repetitions', '2026-11-05', () => [strength(press, [0, 100])]],
    [
      'a set of 2.5 repetitions',
      '2026-11-05',
      () => [strength(press, [2.5, 100])],
    ],
    ['a negative load', '2026-11-05', () => [strength(press, [8, -5])]],
    ['a load over 500 kg', '2026-11-05', () => [strength(press, [8, 501])]],
    [
      'a load with 3 decimals',
      '2026-11-05',
      () => [strength(press, [8, 80.125])],
    ],
    [
      '21 sets on one exercise',
      '2026-11-05',
      () => [
        strength(
          press,
          ...Array.from({ length: 21 }, (): [number, number] => [8, 80]),
        ),
      ],
    ],
    ['a cardio without duration', '2026-11-05', () => [{ exerciseId: rower }]],
    [
      'a treadmill without speed',
      '2026-11-05',
      () => [walk({ speedKmh: null })],
    ],
    [
      'a treadmill over 30 % of incline',
      '2026-11-05',
      () => [walk({ inclinePercent: 31 })],
    ],
    [
      'an exercise that does not exist',
      '2026-11-05',
      () => [strength(999, [8, 80])],
    ],
  ])('refuses %s and saves nothing', async (_, day, items) => {
    await expect(addToDay(db, day, items())).rejects.toThrow(DataError);
    expect(await listWorkouts(db)).toEqual([]);
  });

  it('refuses an archived exercise no session uses', async () => {
    await archiveExercise(db, curl);

    await expect(
      addToDay(db, '2026-11-05', [strength(curl, [10, 40])]),
    ).rejects.toThrow("Un des exercices n'existe plus.");
  });
});

describe('getDay', () => {
  it('gives the session of a day, or nothing', async () => {
    await addToDay(db, '2026-11-05', [strength(press, [8, 100])]);

    expect(await getDay(db, '2026-11-05')).toMatchObject({
      performedOn: '2026-11-05',
    });
    expect(await getDay(db, '2026-11-06')).toBeNull();
  });
});

describe('listWorkouts', () => {
  it('gives the sessions between two days, the newest first', async () => {
    await addToDay(db, '2026-11-01', [strength(press, [8, 90])]);
    await addToDay(db, '2026-11-03', [strength(curl, [10, 40])]);
    await addToDay(db, '2026-11-05', [strength(press, [8, 100])]);

    const workouts = await listWorkouts(db, {
      from: '2026-11-02',
      to: '2026-11-05',
    });

    expect(workouts.map(({ performedOn }) => performedOn)).toEqual([
      '2026-11-05',
      '2026-11-03',
    ]);
  });

  it('refuses a badly written day', async () => {
    await expect(listWorkouts(db, { from: '2026-13-01' })).rejects.toThrow(
      DataError,
    );
  });
});

describe('saveDay', () => {
  it('replaces the exercises and sets of the day', async () => {
    await addToDay(db, '2026-11-05', LEG_DAY());

    const day = await saveDay(db, '2026-11-05', [
      strength(curl, [12, 45]),
      strength(press, [8, 105]),
    ]);

    expect(day?.items).toMatchObject([
      { exerciseId: curl, sets: [{ reps: 12, weightKg: 45 }] },
      { exerciseId: press, sets: [{ reps: 8, weightKg: 105 }] },
    ]);
    const [{ n }] = await db.query<{ n: number }>(
      'SELECT count(*) AS n FROM workout_set',
    );
    expect(n).toBe(2);
  });

  it('starts the session of a day that had none', async () => {
    const day = await saveDay(db, '2026-11-05', [strength(press, [8, 100])]);

    expect(day?.performedOn).toBe('2026-11-05');
  });

  it('deletes the session of the day without any exercise left', async () => {
    await addToDay(db, '2026-11-05', LEG_DAY());

    expect(await saveDay(db, '2026-11-05', [])).toBeNull();
    expect(await listWorkouts(db)).toEqual([]);
    const [{ n }] = await db.query<{ n: number }>(
      'SELECT count(*) AS n FROM workout_exercise',
    );
    expect(n).toBe(0);
  });

  it('keeps an exercise archived since the session', async () => {
    await addToDay(db, '2026-11-05', [strength(curl, [10, 40])]);
    await archiveExercise(db, curl);

    await expect(
      saveDay(db, '2026-11-05', [strength(curl, [11, 40])]),
    ).resolves.toMatchObject({ items: [{ sets: [{ reps: 11 }] }] });
  });

  it('refuses an exercise twice and changes nothing', async () => {
    const before = await addToDay(db, '2026-11-05', LEG_DAY());

    await expect(
      saveDay(db, '2026-11-05', [
        strength(press, [8, 100]),
        strength(press, [6, 110]),
      ]),
    ).rejects.toThrow("Un exercice n'apparaît qu'une fois par séance.");
    expect(await getDay(db, '2026-11-05')).toEqual(before);
  });

  it('refuses a broken set and changes nothing', async () => {
    const before = await addToDay(db, '2026-11-05', LEG_DAY());

    await expect(
      saveDay(db, '2026-11-05', [strength(press, [0, 1])]),
    ).rejects.toThrow(DataError);
    expect(await getDay(db, '2026-11-05')).toEqual(before);
  });
});

describe('lastPerformance', () => {
  it('gives what was done on the exercise the last time', async () => {
    await addToDay(db, '2026-11-01', [strength(press, [8, 90])]);
    await addToDay(db, '2026-11-05', [strength(press, [8, 100], [8, 100])]);
    await addToDay(db, '2026-11-03', [strength(press, [8, 95])]);

    const last = await lastPerformance(db, press);

    expect(last?.sets).toEqual([
      { reps: 8, weightKg: 100 },
      { reps: 8, weightKg: 100 },
    ]);
  });

  it('gives the duration, speed and incline of a treadmill', async () => {
    await addToDay(db, '2026-11-05', LEG_DAY());

    expect(await lastPerformance(db, treadmill)).toMatchObject({
      durationMinutes: 20,
      speedKmh: 5,
      inclinePercent: 12,
    });
  });

  it('leaves out the day being logged', async () => {
    await addToDay(db, '2026-11-01', [strength(press, [8, 90])]);
    await addToDay(db, '2026-11-05', [strength(press, [8, 100])]);

    const last = await lastPerformance(db, press, '2026-11-05');

    expect(last?.sets).toEqual([{ reps: 8, weightKg: 90 }]);
  });

  it('gives nothing for an exercise never done', async () => {
    const fresh = await createExercise(db, {
      name: 'Shrugs',
      kind: 'STRENGTH',
    });

    expect(await lastPerformance(db, fresh.id)).toBeNull();
  });
});
