import { useState } from 'react';

import { middayOf } from '../../utils/dateKey';
import { strengthExercisesOf, strengthProgress } from '../fitness/progress';
import type { Workout } from '../fitness/types';
import type { DateRange } from '../ui/CalendarButton';
import { SelectDropdown } from '../ui/SelectDropdown';
import { SummaryCard } from '../ui/SummaryCard';
import { ChartSkeleton } from './ChartSkeleton';
import { TimeLineChart } from './TimeLineChart';

const TITLE = 'Progression';

interface Props {
  workouts: Workout[];
  period: DateRange;
  isLoading?: boolean;
}

/**
 * The heaviest load of each session on a strength exercise, over the
 * period, the exercise chosen among those done.
 */
export function StrengthProgressChart({
  workouts,
  period,
  isLoading = false,
}: Props) {
  const exercises = strengthExercisesOf(workouts);
  const [choice, setChoice] = useState<number | null>(null);
  const selected =
    exercises.find(({ id }) => id === choice) ?? exercises[0] ?? null;

  if (isLoading) {
    return (
      <SummaryCard title={TITLE}>
        <ChartSkeleton />
      </SummaryCard>
    );
  }

  if (!selected) {
    return (
      <SummaryCard title={TITLE}>
        <p className="text-sm text-theme-600">
          Aucun exercice de musculation sur cette période.
        </p>
      </SummaryCard>
    );
  }

  const points = strengthProgress(workouts, selected.id).map(
    ({ day, maxWeightKg }) => ({ value: maxWeightKg, time: middayOf(day) }),
  );

  return (
    <SummaryCard
      title={TITLE}
      inlineAside
      aside={
        <span className="flex min-w-0 flex-1 basis-40">
          <SelectDropdown
            size="sm"
            className="min-w-0 flex-1 whitespace-nowrap"
            value={String(selected.id)}
            options={exercises.map(({ id, name }) => ({
              value: String(id),
              label: name,
            }))}
            onChange={(value) => setChoice(Number(value))}
            container={document.body}
          />
        </span>
      }
    >
      <TimeLineChart
        points={points}
        name="Charge max"
        unit="kg"
        period={period}
      />
    </SummaryCard>
  );
}
