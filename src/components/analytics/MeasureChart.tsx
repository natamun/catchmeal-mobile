import { useMemo } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import { formatKg, formatWeekday } from '../../utils/format';
import type { DateRange } from '../ui/CalendarButton';
import { SelectDropdown } from '../ui/SelectDropdown';
import { SummaryCard } from '../ui/SummaryCard';
import { ChartSkeleton } from './ChartSkeleton';
import {
  AXIS_LINE,
  AXIS_WIDTH,
  CHART_HEIGHT,
  GRID_STROKE,
  MIN_TICK_GAP,
  SERIES_COLORS,
  X_TICK,
  Y_TICK,
} from './chartStyle';
import { ChartTooltip } from './ChartTooltip';
import { measureScale } from './measureScale';
import type { DashboardDay } from './types';
import { useChartTooltip } from './useChartTooltip';

const TITLE = 'Évolution';
const MAX_DOTS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;
const [LINE_COLOR] = SERIES_COLORS;

export type MeasureKey =
  'weight' | 'bodyFat' | 'fatFreeMass' | 'bodyWater' | 'muscleMass';

const MEASURES: { value: MeasureKey; label: string; unit: string }[] = [
  { value: 'weight', label: 'Poids', unit: 'kg' },
  { value: 'muscleMass', label: 'Masse musculaire', unit: 'kg' },
  { value: 'fatFreeMass', label: 'Masse maigre', unit: 'kg' },
  { value: 'bodyFat', label: 'Masse grasse', unit: '%' },
  { value: 'bodyWater', label: 'Eau corporelle', unit: '%' },
];

/** Date on the axis, as DD-MM. */
function formatTick(time: number) {
  return new Date(time)
    .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    .replace('/', '-');
}

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
  const tooltipArea = useChartTooltip();
  const points = useMemo(
    () =>
      days.flatMap((day) => {
        const value = day[measure];

        return value === null
          ? []
          : [{ value, time: new Date(`${day.day}T12:00:00`).getTime() }];
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

  const scale = measureScale(points.map(({ value }) => value));
  const timeDomain =
    points.length === 1
      ? [points[0].time - DAY_MS, points[0].time + DAY_MS]
      : [startOfDay(period.from).getTime(), endOfDay(period.to).getTime()];

  return (
    <SummaryCard title={TITLE} aside={selector} inlineAside>
      <div ref={tooltipArea}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart
            data={points}
            margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              stroke={AXIS_LINE}
              dataKey="time"
              type="number"
              scale="time"
              domain={timeDomain}
              tickFormatter={formatTick}
              tick={X_TICK}
              minTickGap={MIN_TICK_GAP}
            />
            <YAxis
              stroke={AXIS_LINE}
              width={AXIS_WIDTH}
              interval={0}
              ticks={scale.ticks}
              domain={[scale.bottom, scale.top]}
              tick={Y_TICK}
              tickFormatter={formatKg}
            />
            <Tooltip
              cursor={false}
              content={(props: TooltipContentProps) => (
                <ChartTooltip
                  {...props}
                  label={formatWeekday(new Date(Number(props.label)))}
                />
              )}
            />
            <Line
              type="linear"
              dataKey="value"
              name={label}
              unit={unit}
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={
                points.length <= MAX_DOTS
                  ? { r: 3.5, fill: LINE_COLOR, strokeWidth: 0 }
                  : false
              }
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SummaryCard>
  );
}
