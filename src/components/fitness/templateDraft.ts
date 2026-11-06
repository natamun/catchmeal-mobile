import type {
  Exercise,
  ExerciseKind,
  TemplateItemInput,
  WorkoutTemplate,
  WorkoutTemplateInput,
} from './types';
import { asText, DraftError, readNumber, type Range } from './workoutDraft';

/** An exercise of the favorite being typed; cardio values are text. */
export interface TemplateItemDraft {
  key: string;
  exerciseId: number;
  name: string;
  kind: ExerciseKind;
  duration: string;
  speed: string;
  incline: string;
}

export type TemplateDraftResult =
  { input: WorkoutTemplateInput } | { error: string };

/** The line of an exercise added to a favorite, its values to fill. */
export function templateItemDraft(
  exercise: Pick<Exercise, 'id' | 'name' | 'kind'>,
  key: string = crypto.randomUUID(),
): TemplateItemDraft {
  return {
    key,
    exerciseId: exercise.id,
    name: exercise.name,
    kind: exercise.kind,
    duration: '',
    speed: '',
    incline: '',
  };
}

/** The lines of a saved favorite, to edit it. */
export function templateDrafts(template: WorkoutTemplate): TemplateItemDraft[] {
  return template.items.map((item) => ({
    key: String(item.id),
    exerciseId: item.exerciseId,
    name: item.exerciseName,
    kind: item.kind,
    duration: asText(item.durationMinutes),
    speed: asText(item.speedKmh),
    incline: asText(item.inclinePercent),
  }));
}

/** An optional typed number: empty is null, anything else is checked. */
const optional = (text: string, label: string, range: Range) =>
  text.trim() === '' ? null : readNumber(text, label, range);

function itemInput(item: TemplateItemDraft): TemplateItemInput {
  if (item.kind === 'STRENGTH') return { exerciseId: item.exerciseId };
  const durationMinutes = optional(item.duration, `${item.name}, durée`, {
    min: 0,
    max: 600,
    exclusive: true,
  });
  if (item.kind === 'CARDIO')
    return { exerciseId: item.exerciseId, durationMinutes };
  return {
    exerciseId: item.exerciseId,
    durationMinutes,
    speedKmh: optional(item.speed, `${item.name}, vitesse`, {
      min: 0,
      max: 25,
      exclusive: true,
    }),
    inclinePercent: optional(item.incline, `${item.name}, inclinaison`, {
      min: 0,
      max: 30,
    }),
  };
}

/**
 * The favorite to save from what was typed, or the first mistake found. The
 * cardio values may stay empty: the session then starts from the last time.
 */
export function templateToInput(
  name: string,
  items: TemplateItemDraft[],
): TemplateDraftResult {
  try {
    if (name.trim() === '') throw new DraftError('Nom requis');
    if (items.length === 0) throw new DraftError('Ajoute au moins un exercice');
    return { input: { name: name.trim(), items: items.map(itemInput) } };
  } catch (error) {
    if (error instanceof DraftError) return { error: error.message };
    throw error;
  }
}
