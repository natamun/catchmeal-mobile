import { useMemo } from 'react';

import { middayOf } from '../../utils/dateKey';
import type { DateRange } from '../ui/CalendarButton';
import { SelectDropdown } from '../ui/SelectDropdown';
import { SummaryCard } from '../ui/SummaryCard';
import { ChartSkeleton } from './ChartSkeleton';
import { TimeLineChart } from './TimeLineChart';
import type { DashboardDay } from './types';

const TITLE = 'Évolution';

export type MeasureKey =
  'weight' | 'bodyFat' | 'fatFreeMass' | 'bodyWater' | 'muscleMass';

const MEASURES: { value: MeasureKey; label: string; unit: string }[] = [
  { value: 'weight', label: 'Poids', unit: 'kg' },
  { value: 'muscleMass', label: 'Masse musculaire', unit: 'kg' },
  { value: 'fatFreeMass', label: 'Masse maigre', unit: 'kg' },
  { value: 'bodyFat', label: 'Masse grasse', unit: '%' },
  { value: 'bodyWater', label: 'Eau corporelle', unit: '%' },
];

interface Props {
  measure: MeasureKey;
  onMeasureChange: (measure: MeasureKey) => void;
  days: DashboardDay[];
  period: DateRange;
  isLoading?: boolean;
}

/**
 * Line chart of one body measure over the period, chosen with a select (weight
 * by default). Dots are hidden beyond 31 points.
 */
export function MeasureChart({
  measure,
  onMeasureChange,
  days,
  period,
  isLoading = false,
}: Props) {
  const points = useMemo(
    () =>
      days.flatMap((day) => {
        const value = day[measure];

        return value === null ? [] : [{ value, time: middayOf(day.day) }];
      }),
    [days, measure],
  );

  const { label, unit } =
    MEASURES.find(({ value }) => value === measure) ?? MEASURES[0];
  const selector = (
    <span className="flex min-w-0 flex-1 basis-40">
      <SelectDropdown
        size="sm"
        className="min-w-0 flex-1 whitespace-nowrap"
        value={measure}
        options={MEASURES}
        onChange={(value) => onMeasureChange(value as MeasureKey)}
        container={document.body}
      />
    </span>
  );

  if (isLoading) {
    return (
      <SummaryCard title={TITLE} aside={selector} inlineAside>
        <ChartSkeleton />
      </SummaryCard>
    );
  }

  if (points.length === 0) {
    return (
      <SummaryCard title={TITLE} aside={selector} inlineAside>
        <p className="text-sm text-theme-600">
          {measure === 'weight'
            ? 'Aucune pesée sur cette période.'
            : 'Aucune mesure sur cette période.'}
        </p>
      </SummaryCard>
    );
  }

  return (
    <SummaryCard title={TITLE} aside={selector} inlineAside>
      <TimeLineChart points={points} name={label} unit={unit} period={period} />
    </SummaryCard>
  );
}
