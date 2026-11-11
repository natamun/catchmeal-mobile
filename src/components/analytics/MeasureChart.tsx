import { useMemo } from 'react';

import { middayOf } from '../../utils/dateKey';
import { formatSignedKg as signed } from '../../utils/format';
import type { DateRange } from '../ui/CalendarButton';
import { Card } from '../ui/Card';
import { SelectDropdown } from '../ui/SelectDropdown';
import { ChartSkeleton } from './ChartSkeleton';
import { trendOf } from './periodSummary';
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
 * by default), with its trend dashed and its change per week once there are
 * 3 measures over 2 weeks; the weight's change per week is in the summary
 * above, so its caption names the line only. Dots are hidden beyond 31 points.
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

  const trend = useMemo(() => trendOf(points), [points]);
  const { label, unit } =
    MEASURES.find(({ value }) => value === measure) ?? MEASURES[0];

  const selector = (
    <span className="flex min-w-0 flex-1 basis-40">
      <SelectDropdown
        title="Mesure"
        size="sm"
        className="min-w-0 flex-1 whitespace-nowrap"
        value={measure}
        options={MEASURES}
        onChange={(value) => onMeasureChange(value as MeasureKey)}
      />
    </span>
  );

  if (isLoading) {
    return (
      <Card title={TITLE} action={selector} inlineAction>
        <ChartSkeleton />
      </Card>
    );
  }

  if (points.length === 0) {
    return (
      <Card title={TITLE} action={selector} inlineAction>
        <p className="text-sm text-theme-600">
          {measure === 'weight'
            ? 'Aucune pesée sur cette période.'
            : 'Aucune mesure sur cette période.'}
        </p>
      </Card>
    );
  }

  return (
    <Card title={TITLE} action={selector} inlineAction>
      <TimeLineChart
        points={points}
        name={label}
        unit={unit}
        period={period}
        trend={trend?.ends}
      />
      {trend && (
        <p className="mt-2 flex items-center gap-2 text-xs text-theme-600">
          <span className="w-5 border-t-2 border-dashed border-theme-400" />
          {measure === 'weight' ? (
            'Tendance'
          ) : (
            <>
              Tendance : {signed(trend.perWeek)}
              {'\u00a0'}
              {unit}/sem.
            </>
          )}
        </p>
      )}
    </Card>
  );
}
