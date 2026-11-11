import { useMemo } from 'react';

import { aimedWeeklyKg, goalPaceOf, type GoalType } from '../../data/goals';
import { middayOf } from '../../utils/dateKey';
import { formatKg } from '../../utils/format';
import { linearTrend } from '../../utils/trend';
import { useProfile } from '../profile/profileContext';
import type { DateRange } from '../ui/CalendarButton';
import { SelectDropdown } from '../ui/SelectDropdown';
import { SummaryCard } from '../ui/SummaryCard';
import { ChartSkeleton } from './ChartSkeleton';
import { TimeLineChart } from './TimeLineChart';
import type { DashboardDay } from './types';

const TITLE = 'Évolution';
const DAY_MS = 24 * 60 * 60 * 1000;
/** A trend needs a few measures spread over two weeks at least. */
const MIN_TREND_POINTS = 3;
const MIN_TREND_DAYS = 14;

const signed = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatKg(Math.abs(value))}`;

/**
 * The straight line that fits the measures (least squares), from the first
 * to the last, with its change per week; null with too few measures.
 */
function trendOf(points: { value: number; time: number }[]) {
  if (points.length < MIN_TREND_POINTS) return null;
  const first = points[0].time;
  const last = points.at(-1)!.time;
  if (last - first < MIN_TREND_DAYS * DAY_MS) return null;
  const line = linearTrend(
    points.map(({ value, time }) => ({ day: (time - first) / DAY_MS, value })),
  );
  return {
    ends: [
      { time: first, value: line.valueAt(0) },
      { time: last, value: line.valueAt((last - first) / DAY_MS) },
    ],
    perWeek: line.slope * 7,
  };
}

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
 * 3 measures over 2 weeks. The weight also tells the change the goal aims at.
 * Dots are hidden beyond 31 points.
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

  const { profile } = useProfile();
  const trend = useMemo(() => trendOf(points), [points]);
  const { label, unit } =
    MEASURES.find(({ value }) => value === measure) ?? MEASURES[0];

  const goalType = profile.goalType as GoalType | null;
  const aimed =
    measure === 'weight' && goalType && points.length > 0
      ? aimedWeeklyKg(
          goalType,
          goalPaceOf(goalType, profile.goalPace),
          points.at(-1)!.value,
        )
      : null;
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
          Tendance : {signed(trend.perWeek)} {unit}/sem.
          {aimed !== null &&
            ` · visé : ${aimed === 0 ? 'stable' : `${signed(aimed)} kg/sem.`}`}
        </p>
      )}
    </SummaryCard>
  );
}
