import { describe, expect, it } from 'vitest';

import type { Exercise, TemplateItem, WorkoutItem } from './types';
import {
  draftFor,
  draftFromTemplate,
  draftsOf,
  draftToInput,
  type ItemDraft,
} from './workoutDraft';

const PRESS: Exercise = {
  id: 1,
  name: 'Presse à cuisses',
  kind: 'STRENGTH',
  met: null,
  archived: false,
};
const TREADMILL: Exercise = {
  ...PRESS,
  id: 2,
  name: 'Tapis',
  kind: 'TREADMILL',
};
const ROWER: Exercise = {
  ...PRESS,
  id: 3,
  name: 'Rameur',
  kind: 'CARDIO',
  met: 7,
};

const lastTime = (values: Partial<WorkoutItem>): WorkoutItem => ({
  id: 9,
  exerciseId: 1,
  exerciseName: 'Presse à cuisses',
  kind: 'STRENGTH',
  met: null,
  sets: [],
  durationMinutes: null,
  speedKmh: null,
  inclinePercent: null,
  ...values,
});

const strengthDraft = (...sets: [string, string][]): ItemDraft => ({
  ...draftFor(PRESS, null, 'a'),
  sets: sets.map(([reps, weight]) => ({ reps, weight })),
});

const walkDraft = (duration: string, speed: string, incline: string) => ({
  ...draftFor(TREADMILL, null, 'b'),
  duration,
  speed,
  incline,
});

describe('draftFor', () => {
  it('starts a strength exercise from its last sets', () => {
    const draft = draftFor(
      PRESS,
      lastTime({
        sets: [
          { reps: 8, weightKg: 82.5 },
          { reps: 10, weightKg: 80 },
        ],
      }),
    );

    expect(draft.sets).toEqual([
      { reps: '8', weight: '82,5' },
      { reps: '10', weight: '80' },
    ]);
  });

  it('starts a strength exercise never done with one empty set', () => {
    expect(draftFor(PRESS, null).sets).toEqual([{ reps: '', weight: '' }]);
  });

  it('starts a treadmill from its last duration, speed and incline', () => {
    const draft = draftFor(
      TREADMILL,
      lastTime({
        kind: 'TREADMILL',
        durationMinutes: 30,
        speedKmh: 5.5,
        inclinePercent: 12,
      }),
    );

    expect(draft).toMatchObject({
      sets: [],
      duration: '30',
      speed: '5,5',
      incline: '12',
    });
  });

  it('gives each line its own key', () => {
    expect(draftFor(PRESS, null).key).not.toBe(draftFor(PRESS, null).key);
  });
});

describe('draftFromTemplate', () => {
  const templateItem = (values: Partial<TemplateItem>): TemplateItem => ({
    id: 1,
    exerciseId: 2,
    exerciseName: 'Tapis',
    kind: 'TREADMILL',
    durationMinutes: null,
    speedKmh: null,
    inclinePercent: null,
    ...values,
  });

  it('takes the values the favorite sets, the rest from the last time', () => {
    const draft = draftFromTemplate(
      templateItem({ durationMinutes: 45, speedKmh: 4 }),
      lastTime({
        kind: 'TREADMILL',
        durationMinutes: 30,
        speedKmh: 5,
        inclinePercent: 12,
      }),
    );

    expect(draft).toMatchObject({ duration: '45', speed: '4', incline: '12' });
  });

  it('starts a strength exercise from its last sets', () => {
    const draft = draftFromTemplate(
      templateItem({ exerciseId: 1, exerciseName: 'Presse', kind: 'STRENGTH' }),
      lastTime({ sets: [{ reps: 10, weightKg: 90 }] }),
    );

    expect(draft.sets).toEqual([{ reps: '10', weight: '90' }]);
  });
});

describe('draftsOf', () => {
  it('turns a saved session back into lines', () => {
    const drafts = draftsOf({
      id: 4,
      performedOn: '2026-11-05',
      name: null,
      durationMinutes: 60,
      items: [lastTime({ id: 12, sets: [{ reps: 8, weightKg: 100 }] })],
    });

    expect(drafts).toEqual([
      {
        key: '12',
        exerciseId: 1,
        name: 'Presse à cuisses',
        kind: 'STRENGTH',
        sets: [{ reps: '8', weight: '100' }],
        duration: '',
        speed: '',
        incline: '',
      },
    ]);
  });
});

describe('draftToInput', () => {
  it('reads the typed session, commas included', () => {
    const result = draftToInput({
      performedOn: '2026-11-05',
      name: '  Jambes ',
      duration: '60',
      items: [
        strengthDraft(['8', '82,5'], ['10', '0']),
        walkDraft('20', '5', '12'),
        { ...draftFor(ROWER, null, 'c'), duration: '10' },
      ],
    });

    expect(result).toEqual({
      input: {
        performedOn: '2026-11-05',
        name: 'Jambes',
        durationMinutes: 60,
        items: [
          {
            exerciseId: 1,
            sets: [
              { reps: 8, weightKg: 82.5 },
              { reps: 10, weightKg: 0 },
            ],
          },
          {
            exerciseId: 2,
            durationMinutes: 20,
            speedKmh: 5,
            inclinePercent: 12,
          },
          { exerciseId: 3, durationMinutes: 10 },
        ],
      },
    });
  });

  it('leaves the session duration out when empty and a flat treadmill', () => {
    const result = draftToInput({
      performedOn: '2026-11-05',
      name: ' ',
      duration: ' ',
      items: [walkDraft('30', '6', '')],
    });

    expect(result).toMatchObject({
      input: {
        name: null,
        durationMinutes: null,
        items: [{ inclinePercent: 0 }],
      },
    });
  });

  it.each<[string, string, string, ItemDraft[], string]>([
    ['no date', '', '60', [strengthDraft(['8', '80'])], 'Date requise'],
    ['no exercise', '2026-11-05', '60', [], 'Ajoute au moins un exercice'],
    [
      'a session of 0 minutes',
      '2026-11-05',
      '0',
      [strengthDraft(['8', '80'])],
      'Durée de la séance : entre 0 et 600',
    ],
    [
      'a session of 45.5 minutes',
      '2026-11-05',
      '45,5',
      [strengthDraft(['8', '80'])],
      'Durée de la séance : nombre entier',
    ],
    [
      'a strength exercise without sets',
      '2026-11-05',
      '60',
      [strengthDraft()],
      'Presse à cuisses : au moins une série',
    ],
    [
      'missing repetitions',
      '2026-11-05',
      '60',
      [strengthDraft(['8', '80'], ['', '80'])],
      'Presse à cuisses, série 2, répétitions : valeur requise',
    ],
    [
      '2.5 repetitions',
      '2026-11-05',
      '60',
      [strengthDraft(['2,5', '80'])],
      'Presse à cuisses, série 1, répétitions : nombre entier',
    ],
    [
      'a missing load',
      '2026-11-05',
      '60',
      [strengthDraft(['8', ''])],
      'Presse à cuisses, série 1, charge : valeur requise',
    ],
    [
      'a load over 500 kg',
      '2026-11-05',
      '60',
      [strengthDraft(['8', '501'])],
      'Presse à cuisses, série 1, charge : entre 0 et 500',
    ],
    [
      'a load with 3 decimals',
      '2026-11-05',
      '60',
      [strengthDraft(['8', '80,125'])],
      'Presse à cuisses, série 1, charge : 2 décimales maximum',
    ],
    [
      'a load that is not a number',
      '2026-11-05',
      '60',
      [strengthDraft(['8', 'abc'])],
      'Presse à cuisses, série 1, charge : entre 0 et 500',
    ],
    [
      'a cardio without duration',
      '2026-11-05',
      '60',
      [draftFor(ROWER, null, 'c')],
      'Rameur, durée : valeur requise',
    ],
    [
      'a treadmill without speed',
      '2026-11-05',
      '60',
      [walkDraft('20', '', '5')],
      'Tapis, vitesse : valeur requise',
    ],
    [
      'a treadmill too steep',
      '2026-11-05',
      '60',
      [walkDraft('20', '5', '31')],
      'Tapis, inclinaison : entre 0 et 30',
    ],
  ])('refuses %s', (_, day, duration, items, message) => {
    expect(
      draftToInput({ performedOn: day, name: '', duration, items }),
    ).toEqual({ error: message });
  });
});
