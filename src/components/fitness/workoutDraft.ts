import { hasTooManyDecimals, parseDecimal } from '../../utils/decimals';
import type {
  CardioSet,
  Exercise,
  ExerciseKind,
  Workout,
  WorkoutItem,
  WorkoutItemInput,
} from './types';

/** A set as typed: the fields are text until the session is saved. */
export interface SetDraft {
  reps: string;
  weight: string;
}

/** A set of cardio as typed, its fields text until the session is saved. */
export interface CardioSetDraft {
  duration: string;
  speed: string;
  incline: string;
  resistance: string;
}

/** An exercise of the session being typed: its sets of its kind. */
export interface ItemDraft {
  key: string;
  exerciseId: number;
  name: string;
  kind: ExerciseKind;
  sets: SetDraft[];
  cardioSets: CardioSetDraft[];
}

export type DraftResult = { items: WorkoutItemInput[] } | { error: string };

/** A number as the fields show it, with a comma; empty for null. */
const asText = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : String(value).replace('.', ',');

const EMPTY_SET: SetDraft = { reps: '', weight: '' };

export const EMPTY_CARDIO_SET: CardioSetDraft = {
  duration: '',
  speed: '',
  incline: '',
  resistance: '',
};

const cardioSetDraft = (set: CardioSet): CardioSetDraft => ({
  duration: asText(set.durationMinutes),
  speed: asText(set.speedKmh),
  incline: asText(set.inclinePercent),
  resistance: asText(set.resistance),
});

/**
 * The line of an exercise added to a session, filled with what was done on
 * it the last time, so the next session starts from there.
 */
export function draftFor(
  exercise: Pick<Exercise, 'id' | 'name' | 'kind'>,
  last: WorkoutItem | null,
  key: string = crypto.randomUUID(),
): ItemDraft {
  const isStrength = exercise.kind === 'STRENGTH';
  const sets = last?.sets.map((set) => ({
    reps: String(set.reps),
    weight: asText(set.weightKg),
  }));
  const cardioSets = last?.cardioSets.map(cardioSetDraft);
  return {
    key,
    exerciseId: exercise.id,
    name: exercise.name,
    kind: exercise.kind,
    sets: isStrength ? (sets?.length ? sets : [EMPTY_SET]) : [],
    cardioSets: isStrength
      ? []
      : cardioSets?.length
        ? cardioSets
        : [EMPTY_CARDIO_SET],
  };
}

/** The lines of a saved session, to edit it. */
export function draftsOf(workout: Workout): ItemDraft[] {
  return workout.items.map((item) =>
    draftFor(
      { id: item.exerciseId, name: item.exerciseName, kind: item.kind },
      item,
      String(item.id),
    ),
  );
}

/** Thrown inside draftToInput to stop at the first mistake. */
export class DraftError extends Error {}

interface Range {
  min: number;
  max: number;
  /** True when the minimum itself is refused (a duration of 0). */
  exclusive?: boolean;
  integer?: boolean;
}

/** Reads a typed number within a range; `label` names it in the message. */
function readNumber(text: string, label: string, range: Range) {
  const value = parseDecimal(text);
  if (value === null) throw new DraftError(`${label} : valeur requise`);
  const isBelow = range.exclusive ? value <= range.min : value < range.min;
  if (Number.isNaN(value) || isBelow || value > range.max) {
    throw new DraftError(`${label} : entre ${range.min} et ${range.max}`);
  }
  if (range.integer ? !Number.isInteger(value) : hasTooManyDecimals(text)) {
    throw new DraftError(
      `${label} : ${range.integer ? 'nombre entier' : '2 décimales maximum'}`,
    );
  }
  return value;
}

const MINUTES: Range = { min: 0, max: 600, exclusive: true };

function itemInput(item: ItemDraft): WorkoutItemInput {
  if (item.kind === 'STRENGTH') {
    if (item.sets.length === 0) {
      throw new DraftError(`${item.name} : au moins une série`);
    }
    return {
      exerciseId: item.exerciseId,
      sets: item.sets.map((set, index) => {
        const label = `${item.name}, série ${index + 1}`;
        return {
          reps: readNumber(set.reps, `${label}, répétitions`, {
            min: 1,
            max: 100,
            integer: true,
          }),
          weightKg: readNumber(set.weight, `${label}, charge`, {
            min: 0,
            max: 500,
          }),
        };
      }),
    };
  }
  if (item.cardioSets.length === 0) {
    throw new DraftError(`${item.name} : au moins une série`);
  }
  return {
    exerciseId: item.exerciseId,
    cardioSets: item.cardioSets.map((set, index) =>
      cardioSetInput(item, set, `${item.name}, série ${index + 1}`),
    ),
  };
}

/**
 * A set of cardio from what was typed: a treadmill needs its speed, its
 * slope 0 when left empty; the resistance of another machine is optional.
 */
function cardioSetInput(
  item: ItemDraft,
  set: CardioSetDraft,
  label: string,
): CardioSet {
  const durationMinutes = readNumber(set.duration, `${label}, durée`, MINUTES);
  if (item.kind === 'TREADMILL') {
    return {
      durationMinutes,
      speedKmh: readNumber(set.speed, `${label}, vitesse`, {
        min: 0,
        max: 25,
        exclusive: true,
      }),
      inclinePercent:
        set.incline.trim() === ''
          ? 0
          : readNumber(set.incline, `${label}, inclinaison`, {
              min: 0,
              max: 30,
            }),
      resistance: null,
    };
  }
  return {
    durationMinutes,
    speedKmh: null,
    inclinePercent: null,
    resistance:
      set.resistance.trim() === ''
        ? null
        : readNumber(set.resistance, `${label}, résistance`, {
            min: 0,
            max: 100,
          }),
  };
}

/**
 * The exercises to save from what was typed, or the first mistake found, as a
 * message naming the exercise and the set. An empty list is fine: it empties
 * the day.
 */
export function draftsToItems(items: ItemDraft[]): DraftResult {
  try {
    return { items: items.map(itemInput) };
  } catch (error) {
    if (error instanceof DraftError) return { error: error.message };
    throw error;
  }
}
