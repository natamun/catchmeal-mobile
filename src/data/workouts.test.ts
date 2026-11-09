import { beforeEach, describe, expect, it } from 'vitest';

import type { CardioSet, WorkoutItemInput } from '../components/fitness/types';
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

const cardioSet = (
  durationMinutes: number,
  speedKmh: number | null = null,
  inclinePercent: number | null = null,
  resistance: number | null = null,
): CardioSet => ({ durationMinutes, speedKmh, inclinePercent, resistance });

/** The treadmill, by default 20 minutes at 5 km/h and 12 %. */
const walk = (...cardioSets: CardioSet[]): WorkoutItemInput => ({
  exerciseId: treadmill,
  cardioSets: cardioSets.length ? cardioSets : [cardioSet(20, 5, 12)],
});

/** The rower, by default 10 minutes. */
const row = (...cardioSets: CardioSet[]): WorkoutItemInput => ({
  exerciseId: rower,
  cardioSets: cardioSets.length ? cardioSets : [cardioSet(10)],
});

const LEG_DAY = () => [
  strength(press, [8, 100], [10, 90], [12, 80]),
  walk(),
  row(),
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
          cardioSets: [],
        },
        { kind: 'TREADMILL', sets: [], cardioSets: [cardioSet(20, 5, 12)] },
        { kind: 'CARDIO', sets: [], cardioSets: [cardioSet(10)] },
      ],
    });
  });

  it('logs cardio in sets, each at its own pace or resistance', async () => {
    const day = await addToDay(db, '2026-11-05', [
      walk(cardioSet(10, 3.5, 8), cardioSet(35, 4, 10)),
      row(cardioSet(15, null, null, 8), cardioSet(15)),
    ]);

    expect(day.items.map(({ cardioSets }) => cardioSets)).toEqual([
      [cardioSet(10, 3.5, 8), cardioSet(35, 4, 10)],
      [cardioSet(15, null, null, 8), cardioSet(15)],
    ]);
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

  it('keeps only the values of each kind', async () => {
    const day = await addToDay(db, '2026-11-05', [
      { ...strength(press, [8, 100]), cardioSets: [cardioSet(5, 3)] },
      {
        ...row(cardioSet(10, 12, 5, 6)),
        sets: [{ reps: 1, weightKg: 1 }],
      },
      walk(cardioSet(20, 5, 12, 9)),
    ]);

    expect(day.items.map(({ sets, cardioSets }) => [sets, cardioSets])).toEqual(
      [
        [[{ reps: 8, weightKg: 100 }], []],
        [[], [cardioSet(10, null, null, 6)]],
        [[], [cardioSet(20, 5, 12)]],
      ],
    );
  });

  it('counts a treadmill without incline as flat, and a set at body weight', async () => {
    const day = await addToDay(db, '2026-11-05', [
      walk(cardioSet(20, 5, null)),
      strength(curl, [15, 0]),
    ]);

    expect(day.items[0].cardioSets[0].inclinePercent).toBe(0);
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
    ['a cardio without sets', '2026-11-05', () => [{ exerciseId: rower }]],
    ['a cardio set of 0 minutes', '2026-11-05', () => [row(cardioSet(0))]],
    [
      '21 sets of cardio',
      '2026-11-05',
      () => [row(...Array.from({ length: 21 }, () => cardioSet(1)))],
    ],
    [
      'a treadmill set without speed',
      '2026-11-05',
      () => [walk(cardioSet(20, null, 5))],
    ],
    [
      'a treadmill over 30 % of incline',
      '2026-11-05',
      () => [walk(cardioSet(20, 5, 31))],
    ],
    [
      'a resistance over 100',
      '2026-11-05',
      () => [row(cardioSet(10, null, null, 101))],
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
    const counts = await db.query<{ n: number }>(
      `SELECT count(*) AS n FROM workout_set
       UNION ALL SELECT count(*) FROM cardio_set`,
    );
    expect(counts.map(({ n }) => n)).toEqual([2, 0]);
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

  it('gives the sets of a treadmill, at their pace', async () => {
    await addToDay(db, '2026-11-05', [
      walk(cardioSet(10, 3.5, 8), cardioSet(35, 4, 10)),
    ]);

    expect((await lastPerformance(db, treadmill))?.cardioSets).toEqual([
      cardioSet(10, 3.5, 8),
      cardioSet(35, 4, 10),
    ]);
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
