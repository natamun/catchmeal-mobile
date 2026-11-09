import type {
  Exercise,
  ExerciseKind,
  WorkoutTemplate,
  WorkoutTemplateInput,
} from './types';
import { DraftError } from './workoutDraft';

/** An exercise of the favorite being typed. */
export interface TemplateItemDraft {
  key: string;
  exerciseId: number;
  name: string;
  kind: ExerciseKind;
}

export type TemplateDraftResult =
  { input: WorkoutTemplateInput } | { error: string };

/** The line of an exercise added to a favorite. */
export function templateItemDraft(
  exercise: Pick<Exercise, 'id' | 'name' | 'kind'>,
  key: string = crypto.randomUUID(),
): TemplateItemDraft {
  return {
    key,
    exerciseId: exercise.id,
    name: exercise.name,
    kind: exercise.kind,
  };
}

/** The lines of a saved favorite, to edit it. */
export function templateDrafts(template: WorkoutTemplate): TemplateItemDraft[] {
  return template.items.map((item) => ({
    key: String(item.id),
    exerciseId: item.exerciseId,
    name: item.exerciseName,
    kind: item.kind,
  }));
}

/**
 * The favorite to save from what was typed, or the first mistake found. Its
 * exercises hold no values: a session starts from the last time.
 */
export function templateToInput(
  name: string,
  items: TemplateItemDraft[],
): TemplateDraftResult {
  try {
    if (name.trim() === '') throw new DraftError('Nom requis');
    if (items.length === 0) throw new DraftError('Ajoute au moins un exercice');
    return {
      input: {
        name: name.trim(),
        items: items.map(({ exerciseId }) => ({ exerciseId })),
      },
    };
  } catch (error) {
    if (error instanceof DraftError) return { error: error.message };
    throw error;
  }
}
