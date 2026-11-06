import { useState, type RefObject } from 'react';
import { Trophy } from 'lucide-react';

import { failureMessage } from '../../utils/failureMessage';
import { formatKg } from '../../utils/format';
import { BaseDialog } from '../ui/BaseDialog';
import { useToast } from '../ui/toastContext';
import { addToDay, saveDay } from './api';
import { ItemEditor } from './ItemEditor';
import { newRecords } from './records';
import type { Workout } from './types';
import { draftsToItems, type ItemDraft } from './workoutDraft';

interface ReviewProps {
  day: string;
  isEdit: boolean;
  initialItems: ItemDraft[];
  history: Workout[];
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
    <div className="flex flex-col gap-5">
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ItemEditor
              key={item.key}
              item={item}
              onChange={(changed) =>
                setItems((current) =>
                  current.map((other) =>
                    other.key === changed.key ? changed : other,
                  ),
                )
              }
              onRemove={() =>
                setItems((current) =>
                  current.filter((other) => other.key !== item.key),
                )
              }
            />
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-theme-400">
          {isEdit
            ? 'Plus aucun exercice : enregistrer videra la séance.'
            : 'Ces exercices sont déjà dans la séance du jour.'}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-theme-100 pt-5">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || (!isEdit && items.length === 0)}
          className="w-full cursor-pointer rounded-xl bg-theme-500 px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-theme-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? 'Enregistrement...'
            : isEdit
              ? 'Enregistrer'
              : 'Ajouter à la séance'}
        </button>
      </div>
    </div>
  );
}

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  /** Changes at each opening, so the lines start again from initialItems. */
  sessionKey: number;
  /** The day of the session (YYYY-MM-DD). */
  day: string;
  /** Adding new exercises, or editing the whole session of the day. */
  isEdit: boolean;
  initialItems: ItemDraft[];
  /** Every session logged, to tell a new record. */
  history: Workout[];
  onSaved: () => void;
}

/**
 * Review dialog of the day's session, like the journal's: check the sets and
 * values, then add the exercises to the session, or save the whole session
 * when editing it. Saving tells the new records.
 */
export function TrainingDayDialog({
  dialogRef,
  sessionKey,
  day,
  isEdit,
  initialItems,
  history,
  onSaved,
}: Props) {
  return (
    <BaseDialog
      dialogRef={dialogRef}
      title={isEdit ? 'Modifier : Séance' : 'Ajouter : Séance'}
    >
      <TrainingDayReview
        key={sessionKey}
        day={day}
        isEdit={isEdit}
        initialItems={initialItems}
        history={history}
        onSaved={() => {
          dialogRef.current?.close();
          onSaved();
        }}
      />
    </BaseDialog>
  );
}
