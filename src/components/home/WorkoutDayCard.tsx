import { useEffect, useRef, useState } from 'react';

import { useDataVersion } from '../../hooks/useDataVersion';
import { startOfDay, toDateKey } from '../../utils/dateKey';
import { formatMinutes, formatSince } from '../../utils/format';
import { listExercises, listTemplates, listWorkouts } from '../fitness/api';
import type { Exercise, Workout, WorkoutTemplate } from '../fitness/types';
import { WorkoutDialog } from '../fitness/WorkoutDialog';
import { AddCircleButton } from '../ui/AddCircleButton';
import { EditIconButton } from '../ui/EditIconButton';
import { Skeleton } from '../ui/Skeleton';
import { SummaryCard } from '../ui/SummaryCard';

interface Training {
  workouts: Workout[];
  templates: WorkoutTemplate[];
  exercises: Exercise[];
}

/** Each exercise once, in the order of the session. */
const exerciseNames = (workout: Workout) =>
  [...new Set(workout.items.map((item) => item.exerciseName))].join(', ');

interface Props {
  /** The day shown by the journal (YYYY-MM-DD). */
  day: string;
}

/**
 * The training sessions of the day in the journal, and the "+" to log one,
 * from a favorite or from scratch. Without any, it tells when the last one
 * was.
 */
export function WorkoutDayCard({ day }: Props) {
  const version = useDataVersion();
  const [training, setTraining] = useState<Training | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialog, setDialog] = useState<{
    workout: Workout | null;
    openCount: number;
  }>({ workout: null, openCount: 0 });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listWorkouts(controller.signal),
      listTemplates(controller.signal),
      listExercises(controller.signal),
    ])
      .then(([workouts, templates, exercises]) =>
        setTraining({ workouts, templates, exercises }),
      )
      .catch(() => {
        if (!controller.signal.aborted) {
          setTraining({ workouts: [], templates: [], exercises: [] });
        }
      });
    return () => controller.abort();
  }, [version]);

  const open = (workout: Workout | null) => {
    setDialog(({ openCount }) => ({ workout, openCount: openCount + 1 }));
    dialogRef.current?.showModal();
  };

  const ofDay =
    training?.workouts.filter(({ performedOn }) => performedOn === day) ?? [];
  // The list is the newest first: the first before the day is the last one.
  const lastBefore = training?.workouts.find(
    ({ performedOn }) => performedOn < day,
  );
  const isToday = day === toDateKey(new Date());

  return (
    <>
      <SummaryCard
        title="Séances"
        aside={<AddCircleButton onClick={() => open(null)} />}
      >
        {training === null ? (
          <Skeleton className="h-10 w-full" />
        ) : ofDay.length === 0 ? (
          <p className="text-sm text-theme-600">
            {isToday
              ? "Aucune séance aujourd'hui."
              : 'Aucune séance ce jour-là.'}
            {lastBefore && (
              <span className="block text-theme-500">
                Dernière séance :{' '}
                {formatSince(
                  startOfDay(lastBefore.performedOn).toISOString(),
                  startOfDay(day),
                ).toLowerCase()}
                .
              </span>
            )}
          </p>
        ) : (
          <ul className="-my-2 divide-y divide-theme-100">
            {ofDay.map((workout) => (
              <li key={workout.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-theme-800">
                    {workout.name ?? exerciseNames(workout)}
                  </p>
                  <p className="truncate text-xs text-theme-500">
                    {[
                      workout.durationMinutes &&
                        formatMinutes(workout.durationMinutes),
                      workout.name && exerciseNames(workout),
                    ]
                      .filter(Boolean)
                      .join(' · ') ||
                      `${workout.items.length} exercice${workout.items.length > 1 ? 's' : ''}`}
                  </p>
                </div>
                <EditIconButton onClick={() => open(workout)} />
              </li>
            ))}
          </ul>
        )}
      </SummaryCard>

      <WorkoutDialog
        dialogRef={dialogRef}
        openCount={dialog.openCount}
        workout={dialog.workout}
        day={day}
        history={training?.workouts ?? []}
        templates={training?.templates ?? []}
        exercises={training?.exercises ?? []}
      />
    </>
  );
}
