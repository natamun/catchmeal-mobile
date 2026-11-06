import { hasTooManyDecimals, parseDecimal } from '../../utils/decimals';
import type {
  Exercise,
  ExerciseKind,
  TemplateItem,
  Workout,
  WorkoutInput,
  WorkoutItem,
  WorkoutItemInput,
} from './types';

/** A set as typed: the fields are text until the session is saved. */
export interface SetDraft {
  reps: string;
  weight: string;
}

/** An exercise of the session being typed. */
export interface ItemDraft {
  key: string;
  exerciseId: number;
  name: string;
  kind: ExerciseKind;
  sets: SetDraft[];
  duration: string;
  speed: string;
  incline: string;
}

export type DraftResult = { input: WorkoutInput } | { error: string };

/** A number as the fields show it, with a comma; empty for null. */
export const asText = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : String(value).replace('.', ',');

const EMPTY_SET: SetDraft = { reps: '', weight: '' };

/**
 * The line of an exercise added to a session, filled with what was done on
 * it the last time, so the next session starts from there.
 */
export function draftFor(
  exercise: Pick<Exercise, 'id' | 'name' | 'kind'>,
  last: WorkoutItem | null,
  key: string = crypto.randomUUID(),
): ItemDraft {
  const sets = last?.sets.map((set) => ({
    reps: String(set.reps),
    weight: asText(set.weightKg),
  }));
  return {
    key,
    exerciseId: exercise.id,
    name: exercise.name,
    kind: exercise.kind,
    sets:
      exercise.kind === 'STRENGTH' ? (sets?.length ? sets : [EMPTY_SET]) : [],
    duration: asText(last?.durationMinutes),
    speed: asText(last?.speedKmh),
    incline: asText(last?.inclinePercent),
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

/**
 * The line of an exercise of a favorite: a cardio one takes the favorite's
 * duration, speed and incline where it sets them, the rest comes from the
 * last time, like a strength one.
 */
export function draftFromTemplate(
  item: TemplateItem,
  last: WorkoutItem | null,
  key?: string,
): ItemDraft {
  const draft = draftFor(
    { id: item.exerciseId, name: item.exerciseName, kind: item.kind },
    last,
    key,
  );
  return {
    ...draft,
    duration:
      item.durationMinutes === null
        ? draft.duration
        : asText(item.durationMinutes),
    speed: item.speedKmh === null ? draft.speed : asText(item.speedKmh),
    incline:
      item.inclinePercent === null
        ? draft.incline
        : asText(item.inclinePercent),
  };
}

/** Thrown inside draftToInput to stop at the first mistake. */
export class DraftError extends Error {}

export interface Range {
  min: number;
  max: number;
  /** True when the minimum itself is refused (a duration of 0). */
  exclusive?: boolean;
  integer?: boolean;
}

/** Reads a typed number within a range; `label` names it in the message. */
export function readNumber(text: string, label: string, range: Range) {
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
  const durationMinutes = readNumber(
    item.duration,
    `${item.name}, durée`,
    MINUTES,
  );
  if (item.kind === 'CARDIO') {
    return { exerciseId: item.exerciseId, durationMinutes };
  }
  return {
    exerciseId: item.exerciseId,
    durationMinutes,
    speedKmh: readNumber(item.speed, `${item.name}, vitesse`, {
      min: 0,
      max: 25,
      exclusive: true,
    }),
    inclinePercent:
      item.incline.trim() === ''
        ? 0
        : readNumber(item.incline, `${item.name}, inclinaison`, {
            min: 0,
            max: 30,
          }),
  };
}

/**
 * The session to save from what was typed, or the first mistake found, as a
 * message naming the exercise and the set.
 */
export function draftToInput({
  performedOn,
  name,
  duration,
  items,
}: {
  performedOn: string;
  name: string;
  duration: string;
  items: ItemDraft[];
}): DraftResult {
  try {
    if (performedOn === '') throw new DraftError('Date requise');
    if (items.length === 0) throw new DraftError('Ajoute au moins un exercice');
    return {
      input: {
        performedOn,
        name: name.trim() === '' ? null : name.trim(),
        durationMinutes:
          duration.trim() === ''
            ? null
            : readNumber(duration, 'Durée de la séance', {
                ...MINUTES,
                integer: true,
              }),
        items: items.map(itemInput),
      },
    };
  } catch (error) {
    if (error instanceof DraftError) return { error: error.message };
    throw error;
  }
}
