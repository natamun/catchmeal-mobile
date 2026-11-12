import { useState } from 'react';
import { Trophy } from 'lucide-react';

import { failureMessage } from '../../utils/failureMessage';
import { formatKg } from '../../utils/format';
import { FlowFooter } from '../layout/FlowFooter';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { EditableList, type EditableRow } from '../ui/EditableList';
import { useToast } from '../ui/toastContext';
import { addToDay, saveDay } from './api';
import { ExerciseNotes } from './ExerciseNotes';
import { draftSummary } from './format';
import { ItemSets } from './ItemEditor';
import { newRecords } from './records';
import type { Exercise, Workout } from './types';
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
      <div className="flex flex-col gap-5">
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
  isEdit: boolean;
  initialItems: ItemDraft[];
  history: Workout[];
  /** The library, for the note of each exercise. */
  exercises: readonly Exercise[];
  onSaved: () => void;
}

/**
 * The exercises of the day's session to check, then add to it, or the whole
 * session to save when editing it. Saving tells the new records. Remount it
 * (key) to start again from `initialItems`.
 */
export function TrainingDayReview({
  day,
  isEdit,
  initialItems,
  history,
  exercises,
  onSaved,
}: ReviewProps) {
  const showToast = useToast();
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** A record when a load beats every other day, said with a trophy. */
  const announce = (saved: ReturnType<typeof draftsToItems>) => {
    if (!('items' in saved)) return;
    const thisDay = history.find(({ performedOn }) => performedOn === day);
    const records = newRecords(history, saved.items, thisDay?.id);
    if (records.length === 0) {
      showToast(isEdit ? 'Séance mise à jour' : 'Ajouté à la séance');
    } else if (records.length === 1) {
      const [{ exerciseId, weightKg }] = records;
      const name = items.find((item) => item.exerciseId === exerciseId)?.name;
      showToast(`Nouveau record : ${name}, ${formatKg(weightKg)} kg`, Trophy);
    } else {
      showToast(`${records.length} nouveaux records !`, Trophy);
    }
  };

  const handleSubmit = async () => {
    const result = draftsToItems(items);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (isEdit) {
        await saveDay(day, result.items);
      } else {
        await addToDay(day, result.items);
      }
      onSaved();
      announce(result);
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
        />
      ) : (
        <p className="py-4 text-center text-sm text-theme-400">
          {isEdit
            ? 'Plus aucun exercice : enregistrer videra la séance.'
            : 'Ces exercices sont déjà dans la séance du jour.'}
        </p>
      )}

      <FlowFooter>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || (!isEdit && items.length === 0)}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting
            ? 'Enregistrement...'
            : isEdit
              ? 'Enregistrer la séance'
              : 'Ajouter à la séance'}
        </button>
      </FlowFooter>
    </div>
  );
}
