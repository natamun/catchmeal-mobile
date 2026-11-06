import { describe, expect, it } from 'vitest';

import type { Workout } from '../fitness/types';
import type { Profile } from '../profile/api';
import { getAge } from '../profile/bmr';
import { buildAiContext, type AiContextInput } from './aiContext';
import type { DashboardDay } from './types';

const PROFILE: Profile = {
  height: 180,
  targetWeight: 72,
  dailyCalorieGoal: 2100,
  dailyProteinGoal: 150,
  dailyCarbsGoal: 220,
  dailyFatGoal: 65,
  gender: 'MALE',
  birthDate: '1995-03-10',
  activityLevel: 'MODERATELY_ACTIVE',
  goalType: 'LOSE_FAT',
  theme: null,
};

const EMPTY_PROFILE: Profile = {
  height: null,
  targetWeight: null,
  dailyCalorieGoal: null,
  dailyProteinGoal: null,
  dailyCarbsGoal: null,
  dailyFatGoal: null,
  gender: null,
  birthDate: null,
  activityLevel: null,
  goalType: null,
  theme: null,
};

const TODAY = new Date(2026, 10, 6, 12);

const day = (key: string, values: Partial<DashboardDay>): DashboardDay => ({
  day: key,
  totalKcal: null,
  totalProtein: null,
  totalCarbs: null,
  totalFat: null,
  weight: null,
  bodyFat: null,
  fatFreeMass: null,
  bodyWater: null,
  muscleMass: null,
  goalKcal: null,
  objective: null,
  ...values,
});

const meal = (kcal: number) => ({
  totalKcal: kcal,
  totalProtein: 140,
  totalCarbs: 200,
  totalFat: 60,
});

const build = (input: Partial<AiContextInput> = {}) =>
  buildAiContext({
    from: '2026-11-01',
    to: '2026-11-06',
    days: [],
    profile: PROFILE,
    measured: null,
    weighIns: [],
    workouts: [],
    today: TODAY,
    ...input,
  });

describe('buildAiContext', () => {
  it('describes the person by age, never by birth date', () => {
    const text = build();
    expect(text).toContain(`- Homme, ${getAge('1995-03-10')} ans, 180 cm`);
    expect(text).toContain('- Activité : Modérément actif');
    expect(text).toContain('- Objectif : Perdre du gras, poids cible 72 kg');
    expect(text).not.toContain('1995');
  });

  it('gives the latest weigh-in, even from before the period', () => {
    const text = build({
      weighIns: [
        { weight: 76, loggedAt: new Date(2026, 9, 20, 8).toISOString() },
        { weight: 75.2, loggedAt: new Date(2026, 9, 30, 8).toISOString() },
      ],
    });
    expect(text).toContain('- Dernière pesée : 75,2 kg, le 30 oct. 2026');
  });

  it('gives no latest weigh-in without any', () => {
    expect(build()).not.toContain('Dernière pesée');
  });

  it('gives the goals as the ones set by the person', () => {
    expect(build()).toContain(
      '## Objectifs que je me suis fixés (par jour)\n- 2100 kcal, 150 g de protéines, 220 g de glucides, 65 g de lipides',
    );
  });

  it('says what is missing from an empty profile', () => {
    const text = build({ profile: EMPTY_PROFILE });
    expect(text).toContain('## Profil\n- Non renseigné');
    expect(text).toContain('- Aucun objectif fixé');
  });

  it('gives the measured expenditure with what it rests on', () => {
    const text = build({
      measured: { kcal: 2450, loggedDays: 24, weighIns: 8 },
    });
    expect(text).toContain('- 2450 kcal par jour');
    expect(text).toContain('(24 jours loggés, 8 pesées)');
  });

  it('says when the expenditure cannot be measured yet', () => {
    expect(build()).toContain('- Pas encore mesurable');
  });

  it('averages the logged days only, leaving today out', () => {
    const text = build({
      days: [
        day('2026-11-01', meal(2000)),
        day('2026-11-02', meal(1800)),
        day('2026-11-03', { weight: 75 }),
        day('2026-11-06', meal(500)),
      ],
    });
    expect(text).toContain('- Jours avec repas loggés : 2 sur 5');
    expect(text).toContain("aujourd'hui n'est pas compté");
    expect(text).toContain('- Moyenne par jour loggé : 1900 kcal');
  });

  it('gives each measure from the first to the last value', () => {
    const text = build({
      days: [
        day('2026-11-01', { weight: 76.6, bodyFat: 22.1 }),
        day('2026-11-05', { weight: 75.2, bodyFat: 21.4 }),
      ],
    });
    expect(text).toContain('- Poids : 76,6 → 75,2 kg (−1,4 kg)');
    expect(text).toContain('- Masse grasse : 22,1 → 21,4 % (−0,7 %)');
    expect(text).toContain('impédancemétrie');
  });

  it('adds the weekly weight trend with enough weigh-ins', () => {
    const text = build({
      from: '2026-10-20',
      days: [
        day('2026-10-20', { weight: 77 }),
        day('2026-10-27', { weight: 76.5 }),
        day('2026-11-03', { weight: 76 }),
      ],
    });
    expect(text).toContain('tendance −0,5 kg par semaine');
  });

  it('gives no trend with too few weigh-ins or too short a span', () => {
    const fewWeighIns = build({
      days: [
        day('2026-11-01', { weight: 77 }),
        day('2026-11-05', { weight: 76 }),
      ],
    });
    const shortSpan = build({
      days: [
        day('2026-11-01', { weight: 77 }),
        day('2026-11-02', { weight: 76.8 }),
        day('2026-11-03', { weight: 76.6 }),
      ],
    });
    expect(fewWeighIns).not.toContain('tendance');
    expect(shortSpan).not.toContain('tendance');
  });

  it('flags a single measure as such', () => {
    expect(build({ days: [day('2026-11-02', { weight: 75 })] })).toContain(
      '- Poids : 75 kg (une seule mesure)',
    );
  });

  it('leaves out the composition note without composition', () => {
    expect(build({ days: [day('2026-11-02', { weight: 75 })] })).not.toContain(
      'impédancemétrie',
    );
  });

  it('details a short period day by day, empty days and today shown', () => {
    const text = build({ days: [day('2026-11-02', meal(1800))] });
    const rows = text
      .split('\n')
      .filter((line) => /^\| \D{3,5}\. \d/.test(line));
    expect(text).toContain('## Détail par jour');
    expect(rows).toHaveLength(6);
    expect(text).toContain('| lun. 02/11 | 1800 | 140 | 200 | 60 | – |');
    expect(text).toContain('| dim. 01/11 | – | – | – | – | – |');
    expect(text).toContain('(en cours)');
  });

  it('details a long period week by week', () => {
    const text = build({
      from: '2026-09-01',
      to: '2026-10-31',
      days: [day('2026-09-01', meal(2000)), day('2026-09-02', meal(1800))],
    });
    const rows = text
      .split('\n')
      .filter((line) => /^\| \d{2}\/\d{2} →/.test(line));
    expect(text).toContain('## Détail par semaine');
    expect(rows).toHaveLength(9);
    expect(rows[0]).toBe('| 01/09 → 07/09 | 2/7 | 1900 | 140 | 200 | 60 | – |');
  });

  it('ends on the question to type', () => {
    expect(build().endsWith('Ma question : ')).toBe(true);
  });

  describe('sport', () => {
    const LEG_DAY: Workout = {
      id: 1,
      performedOn: '2026-11-03',
      items: [
        {
          id: 1,
          exerciseId: 1,
          exerciseName: 'Presse à cuisses',
          kind: 'STRENGTH',
          met: null,
          sets: [
            { reps: 8, weightKg: 100 },
            { reps: 10, weightKg: 92.5 },
          ],
          durationMinutes: null,
          speedKmh: null,
          inclinePercent: null,
        },
        {
          id: 2,
          exerciseId: 2,
          exerciseName: 'Tapis de course',
          kind: 'TREADMILL',
          met: null,
          sets: [],
          durationMinutes: 20,
          speedKmh: 5,
          inclinePercent: 12,
        },
      ],
    };
    const WEIGH_INS = [
      { weight: 80, loggedAt: new Date(2026, 10, 1, 8).toISOString() },
    ];

    it('says when there was no session', () => {
      expect(build()).toContain(
        '## Sport sur la période\n- Aucune séance sur la période',
      );
    });

    it('sums up the sessions of the period, without calories', () => {
      const text = build({ workouts: [LEG_DAY], weighIns: WEIGH_INS });

      expect(text).toContain('- Séances : 1');
      expect(text).toContain('- Cardio : 20 min');
      expect(text).toContain(
        '| mar. 03/11 | Presse à cuisses : 8×100, 10×92,5 kg ; Tapis de course : 20 min à 5 km/h, pente 12 % |',
      );
      // 8 × 100 + 10 × 92.5 = 1725 kg; 20 min at 5 km/h = 1.7 km, 12 % of it.
      expect(text).toContain('- Volume soulevé (répétitions × charge) : 1,7 t');
      expect(text).toContain('- Tapis : 1,7 km, 200 m de dénivelé positif');
      const sport = text.slice(
        text.indexOf('## Sport'),
        text.indexOf('## Détail'),
      );
      expect(sport).not.toContain('kcal');
    });

    it('leaves out the sessions outside the period', () => {
      const text = build({
        workouts: [{ ...LEG_DAY, performedOn: '2026-10-25' }],
      });

      expect(text).toContain('- Aucune séance sur la période');
    });

    it('warns not to add calories to a measured expenditure', () => {
      const text = build({
        workouts: [LEG_DAY],
        measured: { kcal: 2450, loggedDays: 24, weighIns: 8 },
      });

      expect(text).toContain('ne leur ajoute pas de calories');
    });

    it('gives no warning without a measured expenditure', () => {
      expect(build({ workouts: [LEG_DAY] })).not.toContain('ne leur ajoute');
    });

    it('sums up a long period week by week', () => {
      const text = build({
        from: '2026-09-01',
        to: '2026-10-31',
        workouts: [
          { ...LEG_DAY, id: 1, performedOn: '2026-09-02' },
          {
            ...LEG_DAY,
            id: 2,
            performedOn: '2026-09-04',
            items: [
              {
                ...LEG_DAY.items[0],
                sets: [{ reps: 8, weightKg: 105 }],
              },
            ],
          },
        ],
        weighIns: WEIGH_INS,
      });

      expect(text).toContain('| 01/09 → 07/09 | 2 |');
      expect(text).toContain(
        '- Charge max, de la première à la dernière séance de la période :\n  - Presse à cuisses : 100 → 105 kg',
      );
      expect(text).toContain('| 08/09 → 14/09 | 0 |');
    });
  });
});
