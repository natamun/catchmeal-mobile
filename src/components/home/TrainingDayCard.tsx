import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useDataVersion } from '../../hooks/useDataVersion';
import { trainingAddPath } from '../../routing/journal';
import { startOfDay, toDateKey } from '../../utils/dateKey';
import { formatSince } from '../../utils/format';
import { listExercises, listWorkouts } from '../fitness/api';
import { ExerciseGymSheet } from '../fitness/ExerciseGymSheet';
import { describeValues } from '../fitness/format';
import type { Exercise, Workout } from '../fitness/types';
import { INSET_ROW_CLASS } from '../ui/buttonStyle';
import { Card } from '../ui/Card';
import { DaySection } from './DaySection';

interface Props {
  /** The day shown by the journal. */
  date: Date;
}

/**
 * The session of the day in the journal, like a meal section: its exercises
 * with their values and a "+" to add some. A tap on an exercise opens its
 * sheet: its note, the last time, its best set, and its sets of the day to
 * change. Without any, it tells when the last session was.
 */
export function TrainingDayCard({ date }: Props) {
  const navigate = useNavigate();
  const version = useDataVersion();
  const day = toDateKey(date);
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  // The id, so the sheet follows the library when its note changes.
  const [sheet, setSheet] = useState<{
    id: number | null;
    isOpen: boolean;
    openCount: number;
  }>({ id: null, isOpen: false, openCount: 0 });

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
    setSheet(({ openCount }) => ({
      id: exerciseId,
      isOpen: true,
      openCount: openCount + 1,
    }));
  };

  const session = workouts?.find(({ performedOn }) => performedOn === day);
  // The list is the newest first: the first before the day is the last one.
  const lastBefore = workouts?.find(({ performedOn }) => performedOn < day);

  return (
    <>
      <Card flush>
        <DaySection
          title="Séance"
          onAdd={() => void navigate(trainingAddPath(date))}
          isLoading={workouts === null}
          rows={(session?.items ?? []).map((item) => (
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
        />

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
        key={sheet.openCount}
        open={sheet.isOpen}
        onClose={() => setSheet((current) => ({ ...current, isOpen: false }))}
        exercise={exercises.find(({ id }) => id === sheet.id) ?? null}
        day={day}
        workouts={workouts ?? []}
      />
    </>
  );
}
