import { Dumbbell } from 'lucide-react';

import { formatMinutes } from '../../utils/format';
import { summarizeWorkouts } from '../fitness/progress';
import type { Workout } from '../fitness/types';
import { Skeleton } from '../ui/Skeleton';
import { SummaryCard } from '../ui/SummaryCard';

interface Props {
  workouts: Workout[];
  isLoading?: boolean;
}

/**
 * Training over the period: the number of sessions, with their time beside
 * it.
 */
export function TrainingCard({ workouts, isLoading = false }: Props) {
  const { sessions, minutes } = summarizeWorkouts(workouts);
  const details = [minutes > 0 && formatMinutes(minutes)].filter(Boolean);

  return (
    <SummaryCard title="Sport">
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-4 w-36" />
        </div>
      ) : sessions === 0 ? (
        <p className="text-sm text-theme-600">
          Aucune séance sur cette période.
        </p>
      ) : (
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-theme-800">
              {sessions}
            </span>
            <span className="mb-1 text-theme-500">
              {sessions > 1 ? 'séances' : 'séance'}
            </span>
          </div>
          {details.length > 0 && (
            <p className="mb-1 flex items-center gap-1 text-right text-sm text-theme-600">
              <Dumbbell className="h-4 w-4 shrink-0" />
              {details.join(' · ')}
            </p>
          )}
        </div>
      )}
    </SummaryCard>
  );
}
