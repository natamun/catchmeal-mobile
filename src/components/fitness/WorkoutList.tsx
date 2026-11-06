import type { ReactNode } from 'react';

import { estimateWorkoutKcal } from '../../data/workoutEnergy';
import { startOfDay } from '../../utils/dateKey';
import { formatWeekday } from '../../utils/format';
import { EditIconButton } from '../ui/EditIconButton';
import { ListCard, ListCardEmpty, ListCardLoading } from '../ui/ListCard';
import { LoadError } from '../ui/LoadError';
import type { Workout } from './types';

interface Props {
  workouts: Workout[];
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => void;
  headerAction: ReactNode;
  onEdit: (workout: Workout) => void;
  weightOn: (day: string) => number | null;
}

/** "50 min · Presse à cuisses, Tapis de course" */
function describe(workout: Workout) {
  const names = [...new Set(workout.items.map((item) => item.exerciseName))];
  return [
    workout.durationMinutes && `${workout.durationMinutes} min`,
    names.join(', '),
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * The sessions, the newest first: the day, the duration and exercises, and
 * the calories they burnt, estimated from the weight of that day.
 */
export function WorkoutList({
  workouts,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  onEdit,
  weightOn,
}: Props) {
  return (
    <ListCard
      header={
        <>
          <h2 className="min-w-0 flex-1 text-sm font-semibold tracking-wide text-theme-500 uppercase">
            Mes séances
          </h2>
          {headerAction}
        </>
      }
    >
      {isLoading && <ListCardLoading />}
      {loadError && <LoadError message={loadError} onRetry={onRetry} />}
      {!isLoading && !loadError && workouts.length === 0 && (
        <ListCardEmpty>Aucune séance enregistrée.</ListCardEmpty>
      )}

      <ul className="divide-y divide-theme-200">
        {workouts.map((workout) => {
          const weight = weightOn(workout.performedOn);
          const energy =
            weight === null ? null : estimateWorkoutKcal(workout, weight);
          return (
            <li
              key={workout.id}
              className="flex items-center gap-3 px-5 py-4 even:bg-theme-50/60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-theme-800">
                  {formatWeekday(startOfDay(workout.performedOn))}
                </p>
                <p className="truncate text-xs text-theme-500">
                  {describe(workout)}
                </p>
              </div>
              {energy && energy.kcal > 0 && (
                <span className="shrink-0 rounded-full bg-theme-50 px-2.5 py-0.5 text-sm font-semibold text-theme-800">
                  ≈ {energy.kcal} kcal
                </span>
              )}
              <EditIconButton onClick={() => onEdit(workout)} />
            </li>
          );
        })}
      </ul>
    </ListCard>
  );
}
