import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router';

import { useDataVersion } from '../../hooks/useDataVersion';
import { trainingAddPath, trainingEditPath } from '../../routing/journal';
import { startOfDay, toDateKey } from '../../utils/dateKey';
import { formatSince } from '../../utils/format';
import { listExercises, listWorkouts } from '../fitness/api';
import { ExerciseGymSheet } from '../fitness/ExerciseGymSheet';
import { describeValues } from '../fitness/format';
import type { Exercise, Workout } from '../fitness/types';
import { AddCircleButton } from '../ui/AddCircleButton';
import { INSET_ROW_CLASS } from '../ui/buttonStyle';
import { Card } from '../ui/Card';
import { EditIconButton } from '../ui/EditIconButton';

interface Props {
  /** The day shown by the journal. */
  date: Date;
}

/**
 * The session of the day in the journal, like a meal section: its exercises
 * with their values, a "+" to add some and, when not empty, an edit button.
 * A tap on an exercise opens what to see during the session: its note, the
 * last time, its best set. Without any, it tells when the last session was.
 */
export function TrainingDayCard({ date }: Props) {
  const navigate = useNavigate();
  const version = useDataVersion();
  const day = toDateKey(date);
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const sheetRef = useRef<HTMLDialogElement>(null);
  // The id, so the sheet follows the library when its note changes.
  const [sheet, setSheet] = useState<{ id: number | null; openCount: number }>({
    id: null,
    openCount: 0,
  });

  useEffect(() => {
    const controller = new AbortController();
    listWorkouts(controller.signal)
      .then(setWorkouts)
      .catch(() => {
        if (!controller.signal.aborted) setWorkouts([]);
      });
    listExercises(controller.signal)
      .then(setExercises)
      .catch(() => {
        if (!controller.signal.aborted) setExercises([]);
      });
    return () => controller.abort();
  }, [version]);

  const openSheet = (exerciseId: number) => {
    setSheet(({ openCount }) => ({ id: exerciseId, openCount: openCount + 1 }));
    sheetRef.current?.showModal();
  };

  const session = workouts?.find(({ performedOn }) => performedOn === day);
  // The list is the newest first: the first before the day is the last one.
  const lastBefore = workouts?.find(({ performedOn }) => performedOn < day);

  return (
    <>
      <Card flush>
        <div
          className={`flex items-center justify-between gap-3 px-5 py-4 ${session ? 'border-b border-theme-100' : ''}`}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-theme-500">Séance</h3>
            {session && (
              <div className="animate-fade-in-up">
                <EditIconButton
                  onClick={() => void navigate(trainingEditPath(date))}
                />
              </div>
            )}
          </div>
          <AddCircleButton
            onClick={() => void navigate(trainingAddPath(date))}
          />
        </div>

        {workouts === null && (
          <div className="flex h-12 animate-delayed-reveal items-center justify-center border-t border-theme-100">
            <LoaderCircle className="h-5 w-5 animate-spin text-theme-400" />
          </div>
        )}

        {session && (
          <ul className="animate-fade-in-up divide-y divide-theme-100 px-5 py-2">
            {session.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openSheet(item.exerciseId)}
                  className={`${INSET_ROW_CLASS} flex-col py-1.5`}
                >
                  <span className="max-w-full truncate text-sm font-semibold text-theme-800">
                    {item.exerciseName}
                  </span>
                  <span className="max-w-full truncate text-xs text-theme-500">
                    {describeValues(item)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {workouts !== null && !session && lastBefore && (
          <p className="-mt-1 px-5 pb-4 text-sm text-theme-600">
            Dernière séance :{' '}
            {formatSince(
              startOfDay(lastBefore.performedOn).toISOString(),
              startOfDay(day),
            ).toLowerCase()}
            .
          </p>
        )}
      </Card>
      <ExerciseGymSheet
        dialogRef={sheetRef}
        exercise={exercises.find(({ id }) => id === sheet.id) ?? null}
        day={day}
        workouts={workouts ?? []}
        openCount={sheet.openCount}
      />
    </>
  );
}
