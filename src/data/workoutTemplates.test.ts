import { beforeEach, describe, expect, it } from 'vitest';

import type { WorkoutTemplateInput } from '../components/fitness/types';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { addTestExercises } from '../test/exercises';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { DataError } from './errors';
import { archiveExercise } from './exercises';
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
} from './workoutTemplates';

let db: Database;
let press: number;
let pulldown: number;
let treadmill: number;
let rower: number;

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
  ({ press, pulldown, treadmill, rower } = await addTestExercises(db));
});

const FULL_BODY = (): WorkoutTemplateInput => ({
  name: ' Full body ',
  items: [{ exerciseId: press }, { exerciseId: pulldown }],
});

const INCLINE_WALK = (): WorkoutTemplateInput => ({
  name: 'Tapis incliné',
  items: [
    {
      exerciseId: treadmill,
      durationMinutes: 45,
      speedKmh: 4,
      inclinePercent: 10,
    },
  ],
});

describe('createTemplate', () => {
  it('saves a favorite with its exercises in order', async () => {
    const template = await createTemplate(db, FULL_BODY());

    expect(template).toMatchObject({
      name: 'Full body',
      items: [
        {
          exerciseId: press,
          exerciseName: 'Presse à cuisses',
          kind: 'STRENGTH',
        },
        { exerciseId: pulldown, kind: 'STRENGTH', durationMinutes: null },
      ],
    });
  });

  it('keeps the duration, speed and incline of a treadmill', async () => {
    const template = await createTemplate(db, INCLINE_WALK());

    expect(template.items[0]).toMatchObject({
      durationMinutes: 45,
      speedKmh: 4,
      inclinePercent: 10,
    });
  });

  it('accepts a cardio without values and drops those of strength', async () => {
    const template = await createTemplate(db, {
      name: 'Mix',
      items: [
        { exerciseId: rower },
        { exerciseId: press, durationMinutes: 10, speedKmh: 5 },
        { exerciseId: rower, durationMinutes: 15, speedKmh: 12 },
      ],
    });

    expect(
      template.items.map(({ durationMinutes, speedKmh }) => [
        durationMinutes,
        speedKmh,
      ]),
    ).toEqual([
      [null, null],
      [null, null],
      [15, null],
    ]);
  });

  it.each<[string, WorkoutTemplateInput]>([
    ['an empty name', { ...FULL_BODY(), name: '  ' }],
    ['a name over 80 characters', { ...FULL_BODY(), name: 'x'.repeat(81) }],
    ['no exercise', { name: 'Vide', items: [] }],
    [
      'an exercise that does not exist',
      { name: 'X', items: [{ exerciseId: 999 }] },
    ],
    [
      'a treadmill over 30 % of incline',
      {
        name: 'Mur',
        items: [
          { exerciseId: treadmill, durationMinutes: 30, inclinePercent: 31 },
        ],
      },
    ],
    [
      'a cardio of 0 minutes',
      { name: 'Rien', items: [{ exerciseId: rower, durationMinutes: 0 }] },
    ],
  ])('refuses %s and saves nothing', async (_, input) => {
    await expect(createTemplate(db, input)).rejects.toThrow(DataError);
    expect(await listTemplates(db)).toEqual([]);
  });

  it('refuses an archived exercise', async () => {
    await archiveExercise(db, pulldown);

    await expect(createTemplate(db, FULL_BODY())).rejects.toThrow(
      "Un des exercices n'existe plus.",
    );
  });
});

describe('listTemplates', () => {
  it('sorts the favorites by name', async () => {
    await createTemplate(db, INCLINE_WALK());
    await createTemplate(db, FULL_BODY());

    expect((await listTemplates(db)).map(({ name }) => name)).toEqual([
      'Full body',
      'Tapis incliné',
    ]);
  });
});

describe('updateTemplate', () => {
  it('renames a favorite and replaces its exercises', async () => {
    const template = await createTemplate(db, FULL_BODY());

    const updated = await updateTemplate(db, template.id, {
      name: 'Haut du corps',
      items: [{ exerciseId: pulldown }],
    });

    expect(updated).toMatchObject({
      id: template.id,
      name: 'Haut du corps',
      items: [{ exerciseId: pulldown }],
    });
  });

  it('refuses a favorite that no longer exists', async () => {
    await expect(updateTemplate(db, 999, FULL_BODY())).rejects.toThrow(
      "Cette séance favorite n'existe plus.",
    );
  });

  it('refuses a broken line and changes nothing', async () => {
    const template = await createTemplate(db, FULL_BODY());

    await expect(
      updateTemplate(db, template.id, { name: 'Autre', items: [] }),
    ).rejects.toThrow(DataError);
    expect(await listTemplates(db)).toEqual([template]);
  });
});

describe('deleteTemplate', () => {
  it('deletes a favorite with its exercises', async () => {
    const template = await createTemplate(db, FULL_BODY());

    await deleteTemplate(db, template.id);

    expect(await listTemplates(db)).toEqual([]);
    expect(
      await db.query('SELECT count(*) AS n FROM workout_template_exercise'),
    ).toEqual([{ n: 0 }]);
  });

  it('refuses a favorite that no longer exists', async () => {
    await expect(deleteTemplate(db, 999)).rejects.toThrow(
      "Cette séance favorite n'existe plus.",
    );
  });
});

describe('archiving an exercise', () => {
  it('takes it out of the favorites', async () => {
    const template = await createTemplate(db, FULL_BODY());

    await archiveExercise(db, press);

    const [after] = await listTemplates(db);
    expect(after.id).toBe(template.id);
    expect(after.items.map(({ exerciseId }) => exerciseId)).toEqual([pulldown]);
  });
});
