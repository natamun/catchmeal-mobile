import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import { startOfDay } from '../../utils/dateKey';
import { weeklySessions } from '../fitness/progress';
import type { Workout } from '../fitness/types';
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
import { legendLabel } from './legendLabel';
import { useChartTooltip } from './useChartTooltip';

const TITLE = 'Séances par semaine';
const MAX_BAR_SIZE = 25;
const TOP_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

/** "02/11", the Monday of the week. */
const weekLabel = (weekStart: string) =>
  startOfDay(weekStart).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });

/** "Semaine du 2 nov." */
const weekTitle = (weekStart: string) =>
  `Semaine du ${startOfDay(weekStart).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })}`;

interface Props {
  workouts: Workout[];
  from: string;
  to: string;
  isLoading?: boolean;
}

/**
 * How many sessions each week of the period held, strength ones and cardio
 * ones stacked: the regularity at a glance.
 */
export function WeeklySessionsChart({
  workouts,
  from,
  to,
  isLoading = false,
}: Props) {
  const tooltipArea = useChartTooltip();

  if (isLoading) {
    return (
      <SummaryCard title={TITLE}>
        <ChartSkeleton />
      </SummaryCard>
    );
  }

  if (workouts.length === 0) {
    return (
      <SummaryCard title={TITLE}>
        <p className="text-sm text-theme-600">
          Aucune séance sur cette période.
        </p>
      </SummaryCard>
    );
  }

  const weeks = weeklySessions(workouts, from, to);
  const top = Math.max(2, ...weeks.map((w) => w.strength + w.cardio));
  const step = top > 8 ? 2 : 1;
  const ticks = Array.from(
    { length: Math.ceil(top / step) + 1 },
    (_, i) => i * step,
  );

  return (
    <SummaryCard title={TITLE}>
      <div ref={tooltipArea}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={weeks}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
            <XAxis
              stroke={AXIS_LINE}
              dataKey="weekStart"
              tickFormatter={weekLabel}
              tick={X_TICK}
              minTickGap={MIN_TICK_GAP}
            />
            <YAxis
              stroke={AXIS_LINE}
              width={AXIS_WIDTH}
              interval={0}
              allowDecimals={false}
              ticks={ticks}
              domain={[0, ticks.at(-1)!]}
              tick={Y_TICK}
            />
            <Tooltip
              cursor={false}
              content={(props: TooltipContentProps) => (
                <ChartTooltip
                  {...props}
                  label={weekTitle(String(props.label))}
                />
              )}
            />
            <Bar
              dataKey="strength"
              name="Musculation"
              stackId="sessions"
              fill={SERIES_COLORS[0]}
              maxBarSize={MAX_BAR_SIZE}
            />
            <Bar
              dataKey="cardio"
              name="Cardio"
              stackId="sessions"
              fill={SERIES_COLORS[1]}
              maxBarSize={MAX_BAR_SIZE}
              radius={TOP_RADIUS}
            />
            <Legend formatter={legendLabel} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SummaryCard>
  );
}
