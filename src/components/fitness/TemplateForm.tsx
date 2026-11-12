import { useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Trash2 } from 'lucide-react';

import { failureMessage } from '../../utils/failureMessage';
import { FlowFooter } from '../layout/FlowFooter';
import { FlowHeader } from '../layout/FlowHeader';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EditableList, type EditableRow } from '../ui/EditableList';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { SHEET_BODY_CLASS } from '../ui/SheetSection';
import { StatTile } from '../ui/StatTile';
import { useToast } from '../ui/toastContext';
import { createTemplate, deleteTemplate, updateTemplate } from './api';
import { ExerciseNotes } from './ExerciseNotes';
import { ExercisePicker } from './ExercisePicker';
import { describeValues } from './format';
import {
  templateDrafts,
  templateItemDraft,
  templateToInput,
  type TemplateItemDraft,
} from './templateDraft';
import type { Exercise, WorkoutItem, WorkoutTemplate } from './types';

/** The number of sets of the last time, short, for the row. */
function lastCount(last: WorkoutItem | undefined) {
  if (!last) return '';
  const count =
    last.kind === 'STRENGTH' ? last.sets.length : last.cardioSets.length;
  return count > 1 ? `${count} séries` : `${count} série`;
}

/**
 * The row of an exercise of the favorite: its sheet recalls the last time
 * and holds the exercise's note.
 */
function itemRow(
  item: TemplateItemDraft,
  last: WorkoutItem | undefined,
  notes: string | null,
  onRemove: () => void,
): EditableRow {
  return {
    id: item.key,
    name: item.name,
    value: lastCount(last),
    editor: (
      <div className={SHEET_BODY_CLASS}>
        <StatTile
          label="Dernière fois"
          value={last ? describeValues(last) : 'Jamais fait'}
        />
        <ExerciseNotes
          key={item.exerciseId}
          exerciseId={item.exerciseId}
          notes={notes}
        />
      </div>
    ),
    onRemove,
  };
}

interface Props {
  /** The favorite edited, or null to create one. */
  template: WorkoutTemplate | null;
  exercises: Exercise[];
  /** The last time each exercise was done. */
  latest: Map<number, WorkoutItem>;
  onClose: () => void;
  /** Saved or deleted: the page can go. */
  onDone: () => void;
}

/**
 * Page content to create or edit a favorite session, like a library meal: a
 * name, exercises searched in the library, put in order by their handle.
 * Each one's sheet recalls the last time and its note.
 */
export function TemplateForm({
  template,
  exercises,
  latest,
  onClose,
  onDone,
}: Props) {
  const showToast = useToast();
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(template?.name ?? '');
  const [items, setItems] = useState<TemplateItemDraft[]>(() =>
    template ? templateDrafts(template) : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = templateToInput(name, items);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (template) {
        await updateTemplate(template.id, result.input);
      } else {
        await createTemplate(result.input);
      }
      showToast(
        template ? 'Séance favorite modifiée' : 'Séance favorite ajoutée',
      );
      onDone();
    } catch (err) {
      setError(failureMessage(err, "Impossible d'enregistrer la séance."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteTemplate(template.id);
      confirmDialogRef.current?.close();
      showToast('Séance favorite supprimée');
      onDone();
    } catch {
      confirmDialogRef.current?.close();
      setError('Impossible de supprimer la séance. Réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const notesOf = (exerciseId: number) =>
    exercises.find(({ id }) => id === exerciseId)?.notes ?? null;

  return (
    <>
      <FlowHeader
        title={template ? 'Modifier la séance' : 'Nouvelle séance'}
        subtitle={template?.name ?? 'Séance favorite'}
        onClose={onClose}
        action={
          template && (
            <button
              type="button"
              aria-label="Supprimer la séance"
              onClick={() => confirmDialogRef.current?.showModal()}
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )
        }
      />
      <form
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
        autoComplete="off"
        className="contents"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="template-name" className={LABEL_CLASS}>
            Nom
          </label>
          <Input
            id="template-name"
            type="text"
            placeholder="Ex : Full body"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <ExercisePicker
          exercises={exercises}
          isAdded={(exercise) =>
            items.some((item) => item.exerciseId === exercise.id)
          }
          onPick={(exercise) =>
            setItems((current) => [...current, templateItemDraft(exercise)])
          }
        />

        {items.length > 0 && (
          <EditableList
            rows={items.map((item) =>
              itemRow(
                item,
                latest.get(item.exerciseId),
                notesOf(item.exerciseId),
                () =>
                  setItems((current) =>
                    current.filter((other) => other.key !== item.key),
                  ),
              ),
            )}
            onMove={(from, to) =>
              setItems((current) => arrayMove(current, from, to))
            }
          />
        )}

        <FlowFooter>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer la séance'}
          </button>
        </FlowFooter>
      </form>

      <ConfirmDialog
        dialogRef={confirmDialogRef}
        title="Supprimer cette séance favorite ?"
        description={`${template?.name ?? 'Cette séance'} disparaît des favorites. Les séances faites avec restent.`}
        confirmLabel="Supprimer"
        pendingLabel="Suppression..."
        isPending={isSubmitting}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
