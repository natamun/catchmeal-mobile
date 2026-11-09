import { describe, expect, it } from 'vitest';

import {
  templateDrafts,
  templateItemDraft,
  templateToInput,
} from './templateDraft';

const PRESS = { id: 1, name: 'Presse', kind: 'STRENGTH' as const };
const TREADMILL = { id: 2, name: 'Tapis', kind: 'TREADMILL' as const };
const ROWER = { id: 3, name: 'Rameur', kind: 'CARDIO' as const };

describe('templateToInput', () => {
  it('keeps the exercises in order, the name trimmed, without values', () => {
    expect(
      templateToInput(' Tapis incliné ', [
        templateItemDraft(PRESS, 'a'),
        templateItemDraft(TREADMILL, 'b'),
        templateItemDraft(ROWER, 'c'),
      ]),
    ).toEqual({
      input: {
        name: 'Tapis incliné',
        items: [{ exerciseId: 1 }, { exerciseId: 2 }, { exerciseId: 3 }],
      },
    });
  });

  it.each([
    ['an empty name', '  ', [templateItemDraft(PRESS, 'a')], 'Nom requis'],
    ['no exercise', 'Vide', [], 'Ajoute au moins un exercice'],
  ])('refuses %s', (_, name, items, error) => {
    expect(templateToInput(name, items)).toEqual({ error });
  });
});

describe('templateDrafts', () => {
  it('turns a saved favorite back into lines', () => {
    expect(
      templateDrafts({
        id: 1,
        name: 'Cardio',
        items: [
          { id: 7, exerciseId: 2, exerciseName: 'Tapis', kind: 'TREADMILL' },
        ],
      }),
    ).toEqual([{ key: '7', exerciseId: 2, name: 'Tapis', kind: 'TREADMILL' }]);
  });
});
