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
import { useChartTooltip } from './useChartTooltip';

const MAX_DOTS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;
const [LINE_COLOR] = SERIES_COLORS;

/** One point of the line: a value at a moment (ms). */
export interface TimePoint {
  value: number;
  time: number;
}

/** Date on the axis, as DD-MM. */
function formatTick(time: number) {
  return new Date(time)
    .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    .replace('/', '-');
}

interface Props {
  points: TimePoint[];
  /** What the line shows, for its tooltip. */
  name: string;
  unit: string;
  period: DateRange;
}

/**
 * One value over the period as a line, zoomed on its values. Dots are hidden
 * beyond 31 points. Needs at least one point.
 */
export function TimeLineChart({ points, name, unit, period }: Props) {
  const tooltipArea = useChartTooltip();
  const scale = measureScale(points.map(({ value }) => value));
  const timeDomain =
    points.length === 1
      ? [points[0].time - DAY_MS, points[0].time + DAY_MS]
      : [startOfDay(period.from).getTime(), endOfDay(period.to).getTime()];

  return (
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
            name={name}
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
  );
}
