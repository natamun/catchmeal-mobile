import { describe, expect, it } from 'vitest';

import type { Exercise, WorkoutItem } from './types';
import {
  draftFor,
  draftsOf,
  draftsToItems,
  type ItemDraft,
} from './workoutDraft';

const PRESS: Exercise = {
  id: 1,
  name: 'Presse à cuisses',
  kind: 'STRENGTH',
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
};

const lastTime = (values: Partial<WorkoutItem>): WorkoutItem => ({
  id: 9,
  exerciseId: 1,
  exerciseName: 'Presse à cuisses',
  kind: 'STRENGTH',
  sets: [],
  cardioSets: [],
  ...values,
});

const strengthDraft = (...sets: [string, string][]): ItemDraft => ({
  ...draftFor(PRESS, null, 'a'),
  sets: sets.map(([reps, weight]) => ({ reps, weight })),
});

/** The treadmill typed, set by set: duration, speed, slope. */
const walkDraft = (...sets: [string, string, string][]): ItemDraft => ({
  ...draftFor(TREADMILL, null, 'b'),
  cardioSets: sets.map(([duration, speed, incline]) => ({
    duration,
    speed,
    incline,
    resistance: '',
  })),
});

/** The rower typed, set by set: duration, resistance. */
const rowDraft = (...sets: [string, string][]): ItemDraft => ({
  ...draftFor(ROWER, null, 'c'),
  cardioSets: sets.map(([duration, resistance]) => ({
    duration,
    speed: '',
    incline: '',
    resistance,
  })),
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

  it('starts a treadmill from its last sets', () => {
    const draft = draftFor(
      TREADMILL,
      lastTime({
        kind: 'TREADMILL',
        cardioSets: [
          {
            durationMinutes: 10,
            speedKmh: 3.5,
            inclinePercent: 8,
            resistance: null,
          },
          {
            durationMinutes: 35,
            speedKmh: 4,
            inclinePercent: 10,
            resistance: null,
          },
        ],
      }),
    );

    expect(draft).toMatchObject({
      sets: [],
      cardioSets: [
        { duration: '10', speed: '3,5', incline: '8', resistance: '' },
        { duration: '35', speed: '4', incline: '10', resistance: '' },
      ],
    });
  });

  it('starts a cardio never done with one empty set', () => {
    expect(draftFor(ROWER, null).cardioSets).toEqual([
      { duration: '', speed: '', incline: '', resistance: '' },
    ]);
  });

  it('gives each line its own key', () => {
    expect(draftFor(PRESS, null).key).not.toBe(draftFor(PRESS, null).key);
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
        cardioSets: [],
      },
    ]);
  });
});

describe('draftsToItems', () => {
  it('reads the typed exercises, commas included', () => {
    expect(
      draftsToItems([
        strengthDraft(['8', '82,5'], ['10', '0']),
        walkDraft(['10', '3,5', '8'], ['35', '4', '10']),
        rowDraft(['15', '8'], ['10', '']),
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
        {
          exerciseId: 2,
          cardioSets: [
            {
              durationMinutes: 10,
              speedKmh: 3.5,
              inclinePercent: 8,
              resistance: null,
            },
            {
              durationMinutes: 35,
              speedKmh: 4,
              inclinePercent: 10,
              resistance: null,
            },
          ],
        },
        {
          exerciseId: 3,
          cardioSets: [
            {
              durationMinutes: 15,
              speedKmh: null,
              inclinePercent: null,
              resistance: 8,
            },
            {
              durationMinutes: 10,
              speedKmh: null,
              inclinePercent: null,
              resistance: null,
            },
          ],
        },
      ],
    });
  });

  it('counts a treadmill without slope as flat', () => {
    expect(draftsToItems([walkDraft(['30', '6', ''])])).toMatchObject({
      items: [{ cardioSets: [{ inclinePercent: 0 }] }],
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
    ['a cardio without sets', [rowDraft()], 'Rameur : au moins une série'],
    [
      'a cardio without duration',
      [draftFor(ROWER, null, 'c')],
      'Rameur, série 1, durée : valeur requise',
    ],
    [
      'a resistance over 100',
      [rowDraft(['10', '101'])],
      'Rameur, série 1, résistance : entre 0 et 100',
    ],
    [
      'a treadmill without speed',
      [walkDraft(['20', '', '5'])],
      'Tapis, série 1, vitesse : valeur requise',
    ],
    [
      'a treadmill too steep, on its second set',
      [walkDraft(['20', '5', '8'], ['20', '5', '31'])],
      'Tapis, série 2, inclinaison : entre 0 et 30',
    ],
  ])('refuses %s', (_, items, message) => {
    expect(draftsToItems(items)).toEqual({ error: message });
  });
});
