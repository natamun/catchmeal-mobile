import { describe, expect, it } from 'vitest';

import type { Exercise, TemplateItem, WorkoutItem } from './types';
import {
  draftFor,
  draftFromTemplate,
  draftsOf,
  draftsToItems,
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

describe('draftsToItems', () => {
  it('reads the typed exercises, commas included', () => {
    expect(
      draftsToItems([
        strengthDraft(['8', '82,5'], ['10', '0']),
        walkDraft('20', '5', '12'),
        { ...draftFor(ROWER, null, 'c'), duration: '10' },
      ]),
    ).toEqual({
      items: [
        {
          exerciseId: 1,
          sets: [
            { reps: 8, weightKg: 82.5 },
            { reps: 10, weightKg: 0 },
          ],
        },
        { exerciseId: 2, durationMinutes: 20, speedKmh: 5, inclinePercent: 12 },
        { exerciseId: 3, durationMinutes: 10 },
      ],
    });
  });

  it('counts a treadmill without slope as flat', () => {
    expect(draftsToItems([walkDraft('30', '6', '')])).toMatchObject({
      items: [{ inclinePercent: 0 }],
    });
  });

  it('accepts no exercise: it empties the day', () => {
    expect(draftsToItems([])).toEqual({ items: [] });
  });

  it.each<[string, ItemDraft[], string]>([
    [
      'a strength exercise without sets',
      [strengthDraft()],
      'Presse à cuisses : au moins une série',
    ],
    [
      'missing repetitions',
      [strengthDraft(['8', '80'], ['', '80'])],
      'Presse à cuisses, série 2, répétitions : valeur requise',
    ],
    [
      '2.5 repetitions',
      [strengthDraft(['2,5', '80'])],
      'Presse à cuisses, série 1, répétitions : nombre entier',
    ],
    [
      'a missing load',
      [strengthDraft(['8', ''])],
      'Presse à cuisses, série 1, charge : valeur requise',
    ],
    [
      'a load over 500 kg',
      [strengthDraft(['8', '501'])],
      'Presse à cuisses, série 1, charge : entre 0 et 500',
    ],
    [
      'a load with 3 decimals',
      [strengthDraft(['8', '80,125'])],
      'Presse à cuisses, série 1, charge : 2 décimales maximum',
    ],
    [
      'a load that is not a number',
      [strengthDraft(['8', 'abc'])],
      'Presse à cuisses, série 1, charge : entre 0 et 500',
    ],
    [
      'a cardio without duration',
      [draftFor(ROWER, null, 'c')],
      'Rameur, durée : valeur requise',
    ],
    [
      'a treadmill without speed',
      [walkDraft('20', '', '5')],
      'Tapis, vitesse : valeur requise',
    ],
    [
      'a treadmill too steep',
      [walkDraft('20', '5', '31')],
      'Tapis, inclinaison : entre 0 et 30',
    ],
  ])('refuses %s', (_, items, message) => {
    expect(draftsToItems(items)).toEqual({ error: message });
  });
});
