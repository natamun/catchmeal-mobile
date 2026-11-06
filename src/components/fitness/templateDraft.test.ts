import { describe, expect, it } from 'vitest';

import {
  templateDrafts,
  templateItemDraft,
  templateToInput,
  type TemplateItemDraft,
} from './templateDraft';

const PRESS = { id: 1, name: 'Presse', kind: 'STRENGTH' as const };
const TREADMILL = { id: 2, name: 'Tapis', kind: 'TREADMILL' as const };
const ROWER = { id: 3, name: 'Rameur', kind: 'CARDIO' as const };

const walk = (duration: string, speed: string, incline: string) => ({
  ...templateItemDraft(TREADMILL, 'b'),
  duration,
  speed,
  incline,
});

describe('templateToInput', () => {
  it('reads the typed favorite, its cardio values with commas', () => {
    expect(
      templateToInput(' Tapis incliné ', [
        templateItemDraft(PRESS, 'a'),
        walk('45', '4,5', '10'),
        { ...templateItemDraft(ROWER, 'c'), duration: '15' },
      ]),
    ).toEqual({
      input: {
        name: 'Tapis incliné',
        items: [
          { exerciseId: 1 },
          {
            exerciseId: 2,
            durationMinutes: 45,
            speedKmh: 4.5,
            inclinePercent: 10,
          },
          { exerciseId: 3, durationMinutes: 15 },
        ],
      },
    });
  });

  it('leaves the empty cardio values to the last time', () => {
    expect(templateToInput('Tapis', [walk('', '', '')])).toEqual({
      input: {
        name: 'Tapis',
        items: [
          {
            exerciseId: 2,
            durationMinutes: null,
            speedKmh: null,
            inclinePercent: null,
          },
        ],
      },
    });
  });

  it.each<[string, string, TemplateItemDraft[], string]>([
    ['no name', '  ', [templateItemDraft(PRESS, 'a')], 'Nom requis'],
    ['no exercise', 'Vide', [], 'Ajoute au moins un exercice'],
    [
      'a speed of 0',
      'Tapis',
      [walk('45', '0', '10')],
      'Tapis, vitesse : entre 0 et 25',
    ],
    [
      'a slope over 30 %',
      'Tapis',
      [walk('45', '4', '35')],
      'Tapis, inclinaison : entre 0 et 30',
    ],
    [
      'a duration that is not a number',
      'Tapis',
      [walk('abc', '4', '10')],
      'Tapis, durée : entre 0 et 600',
    ],
  ])('refuses %s', (_, name, items, message) => {
    expect(templateToInput(name, items)).toEqual({ error: message });
  });
});

describe('templateDrafts', () => {
  it('turns a saved favorite back into lines', () => {
    expect(
      templateDrafts({
        id: 1,
        name: 'Tapis incliné',
        items: [
          {
            id: 7,
            exerciseId: 2,
            exerciseName: 'Tapis',
            kind: 'TREADMILL',
            durationMinutes: 45,
            speedKmh: 4.5,
            inclinePercent: null,
          },
        ],
      }),
    ).toEqual([
      {
        key: '7',
        exerciseId: 2,
        name: 'Tapis',
        kind: 'TREADMILL',
        duration: '45',
        speed: '4,5',
        incline: '',
      },
    ]);
  });
});
