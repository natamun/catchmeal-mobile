import { beforeEach, describe, expect, it } from 'vitest';

import type {
  WorkoutInput,
  WorkoutItemInput,
} from '../components/fitness/types';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { DataError } from './errors';
import { archiveExercise, createExercise, listExercises } from './exercises';
import {
  createWorkout,
  deleteWorkout,
  lastPerformance,
  listWorkouts,
  updateWorkout,
} from './workouts';

let db: Database;
let press: number;
let curl: number;
let treadmill: number;
let rower: number;

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
  const idOf = new Map(
    (await listExercises(db)).map(({ name, id }) => [name, id]),
  );
  press = idOf.get('Presse à cuisses')!;
  curl = idOf.get('Leg curl assis')!;
  treadmill = idOf.get('Tapis de course')!;
  rower = idOf.get('Rameur')!;
});

const strength = (
  exerciseId: number,
  ...sets: [number, number][]
): WorkoutItemInput => ({
  exerciseId,
  sets: sets.map(([reps, weightKg]) => ({ reps, weightKg })),
});

const session = (
  performedOn: string,
  ...items: WorkoutItemInput[]
): WorkoutInput => ({ performedOn, durationMinutes: 60, items });

const LEG_DAY = () =>
  session(
    '2026-11-05',
    strength(press, [8, 100], [10, 90], [12, 80]),
    {
      exerciseId: treadmill,
      durationMinutes: 20,
      speedKmh: 5,
      inclinePercent: 12,
    },
    { exerciseId: rower, durationMinutes: 10 },
  );

describe('createWorkout', () => {
  it('saves the session with its exercises in order and their sets', async () => {
    const workout = await createWorkout(db, LEG_DAY());

    expect(workout).toMatchObject({
      performedOn: '2026-11-05',
      durationMinutes: 60,
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
        { kind: 'CARDIO', met: 7, durationMinutes: 10, speedKmh: null },
      ],
    });
  });

  it('accepts a session without its duration and a set at body weight', async () => {
    const workout = await createWorkout(db, {
      ...session('2026-11-05', strength(curl, [15, 0])),
      durationMinutes: null,
    });

    expect(workout.durationMinutes).toBeNull();
    expect(workout.items[0].sets).toEqual([{ reps: 15, weightKg: 0 }]);
  });

  it('keeps only the fields of each kind', async () => {
    const workout = await createWorkout(
      db,
      session(
        '2026-11-05',
        { ...strength(press, [8, 100]), durationMinutes: 5, speedKmh: 3 },
        {
          exerciseId: rower,
          durationMinutes: 10,
          speedKmh: 12,
          sets: [{ reps: 1, weightKg: 1 }],
        },
      ),
    );

    expect(workout.items[0]).toMatchObject({
      durationMinutes: null,
      speedKmh: null,
    });
    expect(workout.items[1]).toMatchObject({ sets: [], speedKmh: null });
  });

  it('counts a treadmill without incline as flat', async () => {
    const workout = await createWorkout(
      db,
      session('2026-11-05', {
        exerciseId: treadmill,
        durationMinutes: 30,
        speedKmh: 6,
        inclinePercent: null,
      }),
    );

    expect(workout.items[0].inclinePercent).toBe(0);
  });

  it.each<[string, WorkoutInput]>([
    ['a badly written day', session('05/11/2026', strength(press, [8, 100]))],
    ['a session without exercises', session('2026-11-05')],
    [
      'a session of 0 minutes',
      {
        ...session('2026-11-05', strength(press, [8, 100])),
        durationMinutes: 0,
      },
    ],
    [
      'a session over 10 hours',
      {
        ...session('2026-11-05', strength(press, [8, 100])),
        durationMinutes: 601,
      },
    ],
    [
      'a strength exercise without sets',
      session('2026-11-05', strength(press)),
    ],
    [
      'a set of 0 repetitions',
      session('2026-11-05', strength(press, [0, 100])),
    ],
    [
      'a set of 2.5 repetitions',
      session('2026-11-05', strength(press, [2.5, 100])),
    ],
    ['a negative load', session('2026-11-05', strength(press, [8, -5]))],
    ['a load over 500 kg', session('2026-11-05', strength(press, [8, 501]))],
    [
      'a load with 3 decimals',
      session('2026-11-05', strength(press, [8, 80.125])),
    ],
    [
      '21 sets on one exercise',
      session(
        '2026-11-05',
        strength(
          press,
          ...Array.from({ length: 21 }, (): [number, number] => [8, 80]),
        ),
      ),
    ],
    ['a cardio without duration', session('2026-11-05', { exerciseId: rower })],
    [
      'a treadmill without speed',
      session('2026-11-05', { exerciseId: treadmill, durationMinutes: 20 }),
    ],
    [
      'a treadmill over 30 % of incline',
      session('2026-11-05', {
        exerciseId: treadmill,
        durationMinutes: 20,
        speedKmh: 5,
        inclinePercent: 31,
      }),
    ],
    [
      'an exercise that does not exist',
      session('2026-11-05', strength(999, [8, 80])),
    ],
  ])('refuses %s and saves nothing', async (_, input) => {
    await expect(createWorkout(db, input)).rejects.toThrow(DataError);
    expect(await listWorkouts(db)).toEqual([]);
  });

  it('refuses an archived exercise no session uses', async () => {
    await archiveExercise(db, curl);

    await expect(
      createWorkout(db, session('2026-11-05', strength(curl, [10, 40]))),
    ).rejects.toThrow("Un des exercices n'existe plus.");
  });
});

describe('listWorkouts', () => {
  it('gives the sessions between two days, the newest first', async () => {
    await createWorkout(db, session('2026-11-01', strength(press, [8, 90])));
    await createWorkout(db, session('2026-11-03', strength(curl, [10, 40])));
    await createWorkout(db, session('2026-11-05', strength(press, [8, 100])));

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

describe('updateWorkout', () => {
  it('replaces the exercises and sets of the session', async () => {
    const workout = await createWorkout(db, LEG_DAY());

    const updated = await updateWorkout(db, workout.id, {
      performedOn: '2026-11-06',
      durationMinutes: 45,
      items: [strength(curl, [12, 45])],
    });

    expect(updated).toMatchObject({
      id: workout.id,
      performedOn: '2026-11-06',
      durationMinutes: 45,
      items: [{ exerciseId: curl, sets: [{ reps: 12, weightKg: 45 }] }],
    });
    const [{ n }] = await db.query<{ n: number }>(
      'SELECT count(*) AS n FROM workout_set',
    );
    expect(n).toBe(1);
  });

  it('keeps an exercise archived since the session', async () => {
    const workout = await createWorkout(
      db,
      session('2026-11-05', strength(curl, [10, 40])),
    );
    await archiveExercise(db, curl);

    await expect(
      updateWorkout(
        db,
        workout.id,
        session('2026-11-05', strength(curl, [11, 40])),
      ),
    ).resolves.toMatchObject({ items: [{ sets: [{ reps: 11 }] }] });
  });

  it('refuses a session that no longer exists', async () => {
    await expect(updateWorkout(db, 999, LEG_DAY())).rejects.toThrow(
      "Cette séance n'existe plus.",
    );
  });

  it('refuses a broken set and changes nothing', async () => {
    const workout = await createWorkout(db, LEG_DAY());

    await expect(
      updateWorkout(
        db,
        workout.id,
        session('2026-11-05', strength(press, [0, 1])),
      ),
    ).rejects.toThrow(DataError);
    expect(await listWorkouts(db)).toEqual([workout]);
  });
});

describe('deleteWorkout', () => {
  it('deletes the session with its exercises and sets', async () => {
    const workout = await createWorkout(db, LEG_DAY());

    await deleteWorkout(db, workout.id);

    expect(await listWorkouts(db)).toEqual([]);
    const [{ n }] = await db.query<{ n: number }>(
      'SELECT count(*) AS n FROM workout_exercise',
    );
    expect(n).toBe(0);
  });

  it('refuses a session that no longer exists', async () => {
    await expect(deleteWorkout(db, 999)).rejects.toThrow(
      "Cette séance n'existe plus.",
    );
  });
});

describe('lastPerformance', () => {
  it('gives what was done on the exercise the last time', async () => {
    await createWorkout(db, session('2026-11-01', strength(press, [8, 90])));
    await createWorkout(
      db,
      session('2026-11-05', strength(press, [8, 100], [8, 100])),
    );
    await createWorkout(db, session('2026-11-03', strength(press, [8, 95])));

    const last = await lastPerformance(db, press);

    expect(last?.sets).toEqual([
      { reps: 8, weightKg: 100 },
      { reps: 8, weightKg: 100 },
    ]);
  });

  it('gives the duration, speed and incline of a treadmill', async () => {
    await createWorkout(db, LEG_DAY());

    expect(await lastPerformance(db, treadmill)).toMatchObject({
      durationMinutes: 20,
      speedKmh: 5,
      inclinePercent: 12,
    });
  });

  it('leaves out the session being edited', async () => {
    await createWorkout(db, session('2026-11-01', strength(press, [8, 90])));
    const edited = await createWorkout(
      db,
      session('2026-11-05', strength(press, [8, 100])),
    );

    const last = await lastPerformance(db, press, edited.id);

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
