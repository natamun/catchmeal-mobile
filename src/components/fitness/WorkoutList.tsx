import type { ReactNode } from 'react';

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
 * The sessions, the newest first: the day, the duration and the exercises.
 */
export function WorkoutList({
  workouts,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  onEdit,
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
              <EditIconButton onClick={() => onEdit(workout)} />
            </li>
          );
        })}
      </ul>
    </ListCard>
  );
}
