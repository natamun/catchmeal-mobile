import { useState } from 'react';

import { startOfDay } from '../../utils/dateKey';
import { failureMessage } from '../../utils/failureMessage';
import { formatKg, formatShortDate } from '../../utils/format';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { ItemSheet } from '../ui/ItemSheet';
import { SHEET_BODY_CLASS } from '../ui/SheetSection';
import { StatTile as Tile } from '../ui/StatTile';
import { useToast } from '../ui/toastContext';
import { saveDay } from './api';
import { ExerciseNotes } from './ExerciseNotes';
import { describeValues } from './format';
import { ItemSets } from './ItemEditor';
import { exerciseHistory, strengthRecord } from './records';
import type { Exercise, Workout } from './types';
import { useAnnounceSave } from './useAnnounceSave';
import {
  draftFor,
  draftsOf,
  draftsToItems,
  type ItemDraft,
} from './workoutDraft';

const shortDay = (day: string) => formatShortDate(startOfDay(day));

interface Props {
  open: boolean;
  onClose: () => void;
  /** Kept once the sheet closes, so it still shows while sliding away. */
  exercise: Exercise | null;
  /** The day of the session it was opened from (YYYY-MM-DD). */
  day: string;
  workouts: readonly Workout[];
}

/**
 * An exercise of the day's session, opened from the journal: its note, the
 * last time and, for strength, the best set, then its sets of the day to
 * change and save, or the exercise to remove from the session. Closing it
 * without saving leaves the session as it was. Remount it (key) at each
 * opening to start again from the session.
 */
export function ExerciseGymSheet({
  open,
  onClose,
  exercise,
  day,
  workouts,
}: Props) {
  const showToast = useToast();
  const announce = useAnnounceSave();
  const session = workouts.find(({ performedOn }) => performedOn === day);
  const item = session?.items.find(
    ({ exerciseId }) => exerciseId === exercise?.id,
  );
  const [draft, setDraft] = useState<ItemDraft | null>(() =>
    exercise && item ? draftFor(exercise, item, String(item.id)) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const before = exercise
    ? exerciseHistory(workouts, exercise.id).find((entry) => entry.day < day)
    : undefined;
  const record =
    exercise?.kind === 'STRENGTH'
      ? strengthRecord(workouts, exercise.id)
      : null;

  /** Saves the session with this exercise changed, or without it (null). */
  const save = async (next: ItemDraft | null) => {
    if (!session || !draft) return;
    const drafts = draftsOf(session).flatMap((other) =>
      other.exerciseId !== draft.exerciseId ? [other] : next ? [next] : [],
    );
    const result = draftsToItems(drafts);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await saveDay(day, result.items);
      onClose();
      if (next) {
        announce(
          workouts,
          result.items,
          (id) => drafts.find((other) => other.exerciseId === id)?.name,
          'Séance mise à jour',
        );
      } else {
        showToast('Retiré de la séance');
      }
    } catch (err) {
      setError(failureMessage(err, "Impossible d'enregistrer la séance."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ItemSheet
      open={open && exercise !== null}
      onClose={onClose}
      title={exercise?.name ?? ''}
      onRemove={() => void save(null)}
    >
      {exercise && (
        <div className={SHEET_BODY_CLASS}>
          <div className="grid gap-3">
            <Tile
              label="Dernière fois"
              value={before ? describeValues(before.item) : 'Jamais fait'}
              note={before && `le ${shortDay(before.day)}`}
            />
            {record && (
              <Tile
                label="Meilleure série"
                value={`${record.bestSet.reps}×${formatKg(record.bestSet.weightKg)} kg`}
                note={`le ${shortDay(record.bestSetDay)}`}
              />
            )}
          </div>
          <ExerciseNotes exerciseId={exercise.id} notes={exercise.notes} />
          {draft && (
            <>
              <ItemSets item={draft} onChange={setDraft} />
              <div className="relative mt-2">
                {error && (
                  <p className="absolute right-0 bottom-full left-0 mb-2 bg-surface text-sm text-red-500">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void save(draft)}
                  disabled={isSaving}
                  className={PRIMARY_BUTTON_CLASS}
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer la séance'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </ItemSheet>
  );
}
