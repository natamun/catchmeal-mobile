import { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

import { failureMessage } from '../../utils/failureMessage';
import { FlowFooter } from '../layout/FlowFooter';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { EditableList, type EditableRow } from '../ui/EditableList';
import { SHEET_BODY_CLASS } from '../ui/SheetSection';
import { addToDay } from './api';
import { ExerciseNotes } from './ExerciseNotes';
import { draftSummary } from './format';
import { ItemSets } from './ItemEditor';
import type { Exercise, Workout } from './types';
import { useAnnounceSave } from './useAnnounceSave';
import { draftsToItems, type ItemDraft } from './workoutDraft';

/**
 * The row of an exercise of the day's session; its sheet shows the
 * exercise's note above the sets.
 */
function itemRow(
  item: ItemDraft,
  notes: string | null,
  onChange: (item: ItemDraft) => void,
  onRemove: () => void,
): EditableRow {
  return {
    id: item.key,
    name: item.name,
    value: draftSummary(item),
    editor: (
      <div className={SHEET_BODY_CLASS}>
        <ExerciseNotes
          key={item.exerciseId}
          exerciseId={item.exerciseId}
          notes={notes}
        />
        <ItemSets item={item} onChange={onChange} />
      </div>
    ),
    onRemove,
  };
}

interface ReviewProps {
  day: string;
  initialItems: ItemDraft[];
  history: Workout[];
  /** The library, for the note of each exercise. */
  exercises: readonly Exercise[];
  onSaved: () => void;
}

/**
 * The exercises picked for the day's session, to check and put in order by
 * their handle, then add to it. Saving tells the new records. Remount it
 * (key) to start again from `initialItems`.
 */
export function TrainingDayReview({
  day,
  initialItems,
  history,
  exercises,
  onSaved,
}: ReviewProps) {
  const announce = useAnnounceSave();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const result = draftsToItems(items);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await addToDay(day, result.items);
      onSaved();
      announce(
        history,
        result.items,
        (id) => items.find((item) => item.exerciseId === id)?.name,
        'Ajouté à la séance',
      );
    } catch (err) {
      setError(failureMessage(err, "Impossible d'enregistrer la séance."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      {items.length > 0 ? (
        <EditableList
          rows={items.map((item) =>
            itemRow(
              item,
              exercises.find(({ id }) => id === item.exerciseId)?.notes ?? null,
              (changed) =>
                setItems((current) =>
                  current.map((other) =>
                    other.key === changed.key ? changed : other,
                  ),
                ),
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
      ) : (
        <p className="py-4 text-center text-sm text-theme-400">
          Ces exercices sont déjà dans la séance du jour.
        </p>
      )}

      <FlowFooter>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || items.length === 0}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? 'Enregistrement...' : 'Ajouter à la séance'}
        </button>
      </FlowFooter>
    </div>
  );
}
