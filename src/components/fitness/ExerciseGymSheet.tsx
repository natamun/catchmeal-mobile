import type { RefObject } from 'react';

import { startOfDay } from '../../utils/dateKey';
import { formatKg, formatShortDate } from '../../utils/format';
import { BaseDialog } from '../ui/BaseDialog';
import { SHEET_BODY_CLASS } from '../ui/SheetSection';
import { StatTile as Tile } from '../ui/StatTile';
import { ExerciseNotes } from './ExerciseNotes';
import { describeValues } from './format';
import { exerciseHistory, strengthRecord } from './records';
import type { Exercise, Workout } from './types';

const shortDay = (day: string) => formatShortDate(startOfDay(day));

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  exercise: Exercise | null;
  /** The day of the session it was opened from (YYYY-MM-DD). */
  day: string;
  workouts: readonly Workout[];
  /** Changes at each opening, so a note left half typed starts again. */
  openCount: number;
}

/**
 * What to see about an exercise during a session, opened from the journal:
 * its note, the time before this day and, for strength, the best set. The
 * stats and curves stay in the fitness tab.
 */
export function ExerciseGymSheet({
  dialogRef,
  exercise,
  day,
  workouts,
  openCount,
}: Props) {
  const before = exercise
    ? exerciseHistory(workouts, exercise.id).find((entry) => entry.day < day)
    : undefined;
  const record =
    exercise?.kind === 'STRENGTH'
      ? strengthRecord(workouts, exercise.id)
      : null;

  return (
    <BaseDialog dialogRef={dialogRef} title={exercise?.name ?? ''}>
      {exercise && (
        <div className={SHEET_BODY_CLASS}>
          <ExerciseNotes
            key={`${exercise.id}-${openCount}`}
            exerciseId={exercise.id}
            notes={exercise.notes}
          />
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
        </div>
      )}
    </BaseDialog>
  );
}
