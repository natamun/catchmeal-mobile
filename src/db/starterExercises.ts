/**
 * How an exercise is logged:
 * - STRENGTH: sets of repetitions at a load;
 * - TREADMILL: a duration at a speed and an incline;
 * - CARDIO: a duration.
 */
export type ExerciseKind = 'STRENGTH' | 'TREADMILL' | 'CARDIO';

export interface StarterExercise {
  name: string;
  kind: ExerciseKind;
}

/**
 * The exercise library a new install starts with: the usual gym machines, in
 * French. The user renames, adds or removes them to match their gym.
 */
export const STARTER_EXERCISES: readonly StarterExercise[] = [
  { name: 'Presse à cuisses', kind: 'STRENGTH' },
  { name: 'Squat guidé', kind: 'STRENGTH' },
  { name: 'Leg extension', kind: 'STRENGTH' },
  { name: 'Leg curl assis', kind: 'STRENGTH' },
  { name: 'Leg curl allongé', kind: 'STRENGTH' },
  { name: 'Adducteurs', kind: 'STRENGTH' },
  { name: 'Abducteurs', kind: 'STRENGTH' },
  { name: 'Mollets debout', kind: 'STRENGTH' },
  { name: 'Hip thrust', kind: 'STRENGTH' },
  { name: 'Chest press', kind: 'STRENGTH' },
  { name: 'Développé couché', kind: 'STRENGTH' },
  { name: 'Développé incliné', kind: 'STRENGTH' },
  { name: 'Pec deck', kind: 'STRENGTH' },
  { name: 'Écartés à la poulie', kind: 'STRENGTH' },
  { name: 'Tirage vertical', kind: 'STRENGTH' },
  { name: 'Tirage horizontal', kind: 'STRENGTH' },
  { name: 'Rowing machine', kind: 'STRENGTH' },
  { name: 'Tractions assistées', kind: 'STRENGTH' },
  { name: 'Lombaires', kind: 'STRENGTH' },
  { name: 'Développé épaules', kind: 'STRENGTH' },
  { name: 'Élévations latérales', kind: 'STRENGTH' },
  { name: 'Oiseau machine', kind: 'STRENGTH' },
  { name: 'Curl biceps machine', kind: 'STRENGTH' },
  { name: 'Curl biceps haltères', kind: 'STRENGTH' },
  { name: 'Extension triceps poulie', kind: 'STRENGTH' },
  { name: 'Dips assistés', kind: 'STRENGTH' },
  { name: 'Crunch machine', kind: 'STRENGTH' },
  { name: 'Tapis de course', kind: 'TREADMILL' },
  { name: 'Vélo stationnaire', kind: 'CARDIO' },
  { name: 'Elliptique', kind: 'CARDIO' },
  { name: 'Rameur', kind: 'CARDIO' },
  { name: 'Stepper', kind: 'CARDIO' },
];
