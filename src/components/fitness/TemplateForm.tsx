import { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Copy } from 'lucide-react';

import { failureMessage } from '../../utils/failureMessage';
import { copyName } from '../../utils/format';
import { MAX_LENGTH } from '../../utils/validation';
import { FlowFooter } from '../layout/FlowFooter';
import { FlowHeader } from '../layout/FlowHeader';
import { ActionMenu } from '../ui/ActionMenu';
import {
  HEADER_ICON_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
} from '../ui/buttonStyle';
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
  /** For a new favorite, the one it starts as a copy of. */
  copyOf?: WorkoutTemplate | null;
  exercises: Exercise[];
  /** The last time each exercise was done. */
  latest: Map<number, WorkoutItem>;
  onClose: () => void;
  /** Opens a new favorite filled from this one. */
  onCopy: () => void;
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
  copyOf,
  exercises,
  latest,
  onClose,
  onCopy,
  onDone,
}: Props) {
  const showToast = useToast();
  const source = template ?? copyOf ?? null;
  const [name, setName] = useState(
    template?.name ??
      (copyOf ? copyName(copyOf.name, MAX_LENGTH.templateName) : ''),
  );
  const [items, setItems] = useState<TemplateItemDraft[]>(() =>
    source ? templateDrafts(source) : [],
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
      showToast('Séance favorite supprimée');
      onDone();
    } catch {
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
            <ActionMenu
              title={template.name}
              actions={[
                {
                  label: 'Dupliquer la séance',
                  icon: Copy,
                  onSelect: onCopy,
                },
              ]}
              onDelete={() => void handleDelete()}
              deleteLabel="Supprimer la séance"
              buttonClassName={HEADER_ICON_BUTTON_CLASS}
            />
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
            maxLength={MAX_LENGTH.templateName}
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
    </>
  );
}
