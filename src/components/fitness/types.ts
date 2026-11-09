/**
 * How an exercise is logged, in sets:
 * - STRENGTH: repetitions at a load;
 * - TREADMILL: a duration at a speed and an incline;
 * - CARDIO: a duration, at a resistance when the machine has one.
 */
export type ExerciseKind = 'STRENGTH' | 'TREADMILL' | 'CARDIO';

/**
 * An exercise of the user's library. An archived exercise is hidden but kept
 * for the past sessions.
 */
export interface Exercise {
  id: number;
  name: string;
  kind: ExerciseKind;
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
 * One set of cardio, such as 10 minutes at 3.5 km/h and 8 %: its duration,
 * the speed and incline on a treadmill, the resistance on another machine,
 * which may stay unknown.
 */
export interface CardioSet {
  durationMinutes: number;
  speedKmh: number | null;
  inclinePercent: number | null;
  resistance: number | null;
}

/**
 * An exercise done in a session: its sets, of repetitions for strength, of
 * minutes for cardio.
 */
export interface WorkoutItem {
  id: number;
  exerciseId: number;
  exerciseName: string;
  kind: ExerciseKind;
  sets: WorkoutSet[];
  cardioSets: CardioSet[];
}

/**
 * The training of a day (YYYY-MM-DD): its exercises in order, each once.
 */
export interface Workout {
  id: number;
  performedOn: string;
  items: WorkoutItem[];
}

export interface WorkoutItemInput {
  exerciseId: number;
  sets?: WorkoutSet[];
  cardioSets?: CardioSet[];
}

/**
 * An exercise of a favorite session. It holds no values: a session started
 * from it begins with the sets of the last time each exercise was done.
 */
export interface TemplateItem {
  id: number;
  exerciseId: number;
  exerciseName: string;
  kind: ExerciseKind;
}

/** A favorite session ("Full body"), to start a session from in one go. */
export interface WorkoutTemplate {
  id: number;
  name: string;
  items: TemplateItem[];
}

export interface TemplateItemInput {
  exerciseId: number;
}

export interface WorkoutTemplateInput {
  name: string;
  items: TemplateItemInput[];
}
