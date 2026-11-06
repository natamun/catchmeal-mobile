import { useState } from 'react';

import { middayOf } from '../../utils/dateKey';
import {
  strengthExercisesOf,
  strengthProgress,
  type ProgressMetric,
} from '../fitness/progress';
import type { Workout } from '../fitness/types';
import type { DateRange } from '../ui/CalendarButton';
import { PillTabs } from '../ui/PillTabs';
import { SelectDropdown } from '../ui/SelectDropdown';
import { SummaryCard } from '../ui/SummaryCard';
import { ChartSkeleton } from './ChartSkeleton';
import { TimeLineChart } from './TimeLineChart';

const TITLE = 'Progression';

const METRICS: { value: ProgressMetric; label: string; name: string }[] = [
  { value: 'max', label: 'Charge max', name: 'Charge max' },
  { value: 'oneRepMax', label: '1RM', name: '1RM estimé' },
  { value: 'volume', label: 'Volume', name: 'Volume' },
];

interface Props {
  workouts: Workout[];
  period: DateRange;
  isLoading?: boolean;
}

/**
 * How a strength exercise progresses over the period: its heaviest load, its
 * estimated one-rep max or its volume, the exercise chosen among those done.
 */
export function StrengthProgressChart({
  workouts,
  period,
  isLoading = false,
}: Props) {
  const exercises = strengthExercisesOf(workouts);
  const [choice, setChoice] = useState<number | null>(null);
  const [metric, setMetric] = useState<ProgressMetric>('max');
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

  const points = strengthProgress(workouts, selected.id, metric).map(
    ({ day, value }) => ({ value, time: middayOf(day) }),
  );
  const { name } = METRICS.find(({ value }) => value === metric)!;

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
            options={exercises.map(({ id, name: label }) => ({
              value: String(id),
              label,
            }))}
            onChange={(value) => setChoice(Number(value))}
            container={document.body}
          />
        </span>
      }
    >
      <PillTabs
        name="progressMetric"
        options={METRICS}
        value={metric}
        onChange={setMetric}
        className="mb-4 self-start"
      />
      <TimeLineChart points={points} name={name} unit="kg" period={period} />
    </SummaryCard>
  );
}
