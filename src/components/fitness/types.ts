import type { ExerciseKind } from '../../db/starterExercises';

export type { ExerciseKind };

/** Name of each kind of exercise, as the screens show it. */
export const KIND_LABELS: Record<ExerciseKind, string> = {
  STRENGTH: 'Musculation',
  TREADMILL: 'Tapis de course',
  CARDIO: 'Cardio',
};

/**
 * An exercise of the user's library. `met` is the effort of a cardio
 * exercise. An archived exercise is hidden but kept for the past sessions.
 */
export interface Exercise {
  id: number;
  name: string;
  kind: ExerciseKind;
  met: number | null;
  archived: boolean;
}

export interface ExerciseInput {
  name: string;
  kind: ExerciseKind;
}

/** One set: repetitions at a load (0 kg for the body weight alone). */
export interface WorkoutSet {
  reps: number;
  weightKg: number;
}

/**
 * An exercise done in a session: its sets for strength, its duration for
 * cardio, with the speed and incline on a treadmill.
 */
export interface WorkoutItem {
  id: number;
  exerciseId: number;
  exerciseName: string;
  kind: ExerciseKind;
  met: number | null;
  sets: WorkoutSet[];
  durationMinutes: number | null;
  speedKmh: number | null;
  inclinePercent: number | null;
}

/** A training session on a day (YYYY-MM-DD), its exercises in order. */
export interface Workout {
  id: number;
  performedOn: string;
  durationMinutes: number | null;
  items: WorkoutItem[];
}

export interface WorkoutItemInput {
  exerciseId: number;
  sets?: WorkoutSet[];
  durationMinutes?: number | null;
  speedKmh?: number | null;
  inclinePercent?: number | null;
}

export interface WorkoutInput {
  performedOn: string;
  durationMinutes: number | null;
  items: WorkoutItemInput[];
}
