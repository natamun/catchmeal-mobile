import { beforeEach, describe, expect, it } from 'vitest';

import type { ExerciseInput } from '../components/fitness/types';
import type { Database } from '../db/database';
import { migrate } from '../db/migrations';
import { STARTER_EXERCISES } from '../db/starterExercises';
import { openMemoryDatabase } from '../test/nodeDatabase';
import { DataError } from './errors';
import {
  archiveExercise,
  createExercise,
  DEFAULT_CARDIO_MET,
  listExercises,
  updateExercise,
} from './exercises';

let db: Database;

beforeEach(async () => {
  db = openMemoryDatabase();
  await migrate(db);
});

const NEW: ExerciseInput = { name: '  Presse inclinée  ', kind: 'STRENGTH' };

/** Puts the exercise in a session, as the fitness tab would. */
async function useInSession(exerciseId: number) {
  const { lastId } = await db.run(
    "INSERT INTO workout (performed_on) VALUES ('2026-11-05')",
  );
  await db.run(
    'INSERT INTO workout_exercise (workout_id, exercise_id, position) VALUES (?, ?, 0)',
    [lastId, exerciseId],
  );
}

describe('listExercises', () => {
  it('starts with the starter library, sorted the French way', async () => {
    const names = (await listExercises(db)).map(({ name }) => name);

    expect(names).toHaveLength(STARTER_EXERCISES.length);
    expect(names).toEqual(
      [...names].sort((a, b) =>
        a.localeCompare(b, 'fr', { sensitivity: 'base' }),
      ),
    );
  });
});

describe('createExercise', () => {
  it('adds the exercise with its name trimmed', async () => {
    const exercise = await createExercise(db, NEW);

    expect(exercise).toEqual({
      id: exercise.id,
      name: 'Presse inclinée',
      kind: 'STRENGTH',
      met: null,
      archived: false,
    });
  });

  it('gives a new cardio exercise a moderate effort', async () => {
    const exercise = await createExercise(db, {
      name: 'Corde à sauter',
      kind: 'CARDIO',
    });

    expect(exercise.met).toBe(DEFAULT_CARDIO_MET);
  });

  it.each<[string, Partial<ExerciseInput>]>([
    ['an empty name', { name: '   ' }],
    ['a name over 80 characters', { name: 'x'.repeat(81) }],
    ['an unknown kind', { kind: 'YOGA' as ExerciseInput['kind'] }],
  ])('refuses %s', async (_, override) => {
    await expect(createExercise(db, { ...NEW, ...override })).rejects.toThrow(
      DataError,
    );
  });

  it('refuses a name already used, case and accents aside', async () => {
    await expect(
      createExercise(db, { name: 'presse a cuisses', kind: 'STRENGTH' }),
    ).rejects.toThrow('Un exercice porte déjà ce nom.');
  });

  it('accepts the name of an archived exercise', async () => {
    const old = await createExercise(db, NEW);
    await archiveExercise(db, old.id);

    await expect(createExercise(db, NEW)).resolves.toMatchObject({
      archived: false,
    });
  });
});

describe('updateExercise', () => {
  it('renames an exercise', async () => {
    const exercise = await createExercise(db, NEW);

    const renamed = await updateExercise(db, exercise.id, {
      ...NEW,
      name: 'Presse 45°',
    });

    expect(renamed.name).toBe('Presse 45°');
  });

  it('keeps its own name free for itself', async () => {
    const exercise = await createExercise(db, NEW);

    await expect(
      updateExercise(db, exercise.id, { ...NEW, name: 'PRESSE INCLINÉE' }),
    ).resolves.toMatchObject({ name: 'PRESSE INCLINÉE' });
  });

  it('refuses the name of another exercise', async () => {
    const exercise = await createExercise(db, NEW);

    await expect(
      updateExercise(db, exercise.id, { ...NEW, name: 'Leg extension' }),
    ).rejects.toThrow('Un exercice porte déjà ce nom.');
  });

  it('changes the kind of an exercise no session uses yet', async () => {
    const exercise = await createExercise(db, NEW);

    const changed = await updateExercise(db, exercise.id, {
      ...NEW,
      kind: 'CARDIO',
    });

    expect(changed).toMatchObject({ kind: 'CARDIO', met: DEFAULT_CARDIO_MET });
  });

  it('refuses to change the kind once a session uses the exercise', async () => {
    const exercise = await createExercise(db, NEW);
    await useInSession(exercise.id);

    await expect(
      updateExercise(db, exercise.id, { ...NEW, kind: 'CARDIO' }),
    ).rejects.toThrow('son type ne peut plus changer');
    expect(
      (await listExercises(db)).find(({ id }) => id === exercise.id),
    ).toMatchObject({ kind: 'STRENGTH' });
  });

  it('refuses to change an archived exercise', async () => {
    const exercise = await createExercise(db, NEW);
    await archiveExercise(db, exercise.id);

    await expect(updateExercise(db, exercise.id, NEW)).rejects.toThrow(
      "Cet exercice n'existe plus.",
    );
  });
});

describe('archiveExercise', () => {
  it('archives an exercise used in a session, which keeps it', async () => {
    const exercise = await createExercise(db, NEW);
    await useInSession(exercise.id);

    const archived = await archiveExercise(db, exercise.id);

    expect(archived.archived).toBe(true);
  });

  it('refuses an exercise already archived', async () => {
    const exercise = await createExercise(db, NEW);
    await archiveExercise(db, exercise.id);

    await expect(archiveExercise(db, exercise.id)).rejects.toThrow(
      "Cet exercice n'existe plus.",
    );
  });
});
