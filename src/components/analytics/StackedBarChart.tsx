import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  useActiveTooltipLabel,
  useIsTooltipActive,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
} from 'recharts';

import {
  AXIS_LINE,
  AXIS_WIDTH,
  CHART_HEIGHT,
  GRID_STROKE,
  MIN_TICK_GAP,
  X_TICK,
  Y_TICK,
} from './chartStyle';
import { legendLabel } from './legendLabel';
import { useChartTooltip } from './useChartTooltip';

const INITIAL_WIDTH = 530;
const MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };
const MAX_BAR_SIZE = 25;
const TOP_RADIUS: [number, number, number, number] = [4, 4, 0, 0];

/** One stacked series: its field in the data, its name and its colour. */
interface BarSeries {
  dataKey: string;
  label: string;
  fill: string;
}

/**
 * One piece of a stacked bar; the other bars fade while the tooltip shows one
 * of them, and a point with `inProgress` (a day not over) is paler. `labelKey`
 * is the field the x axis reads.
 */
function Segment({ labelKey, ...props }: BarShapeProps & { labelKey: string }) {
  const hovering = useIsTooltipActive();
  const activeLabel = useActiveTooltipLabel();
  const point = props.payload as Record<string, unknown>;
  const dimmed = hovering && activeLabel !== point[labelKey];
  const opacity = point.inProgress === true ? 0.5 : 1;

  return (
    <Rectangle
      {...props}
      className="transition-opacity"
      opacity={dimmed ? opacity * 0.4 : opacity}
    />
  );
}

interface Props<T> {
  data: T[];
  /** The field of each point the x axis shows. */
  labelKey: string;
  /** Stacked from the bottom up; the listed `roundedKeys` get a round top. */
  series: readonly BarSeries[];
  roundedKeys: readonly string[];
  /** Graduations of the y axis, from 0 to the last one. */
  ticks: number[];
  tickFormatter?: (label: string) => string;
  tooltip: (props: TooltipContentProps) => ReactNode;
  height?: number;
  /** Told the width of the chart, to choose how finely to group the bars. */
  onPlotWidth?: (width: number) => void;
}

/**
 * The stacked bar chart of the stats page, shared by the calories and the
 * sessions so they behave alike: a finger sliding along the bars moves the
 * tooltip from one to the next, the other bars fade, and a press outside
 * closes it.
 */
export function StackedBarChart<T>({
  data,
  labelKey,
  series,
  roundedKeys,
  ticks,
  tickFormatter,
  tooltip,
  height = CHART_HEIGHT,
  onPlotWidth,
}: Props<T>) {
  const tooltipArea = useChartTooltip();
  const order = series.map(({ dataKey }) => dataKey);

  return (
    <div ref={tooltipArea}>
      <ResponsiveContainer
        width="100%"
        height={height}
        onResize={(width) => onPlotWidth?.(width - AXIS_WIDTH - MARGIN.right)}
      >
        <BarChart data={data} margin={MARGIN}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            stroke={AXIS_LINE}
            dataKey={labelKey}
            tickFormatter={tickFormatter}
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
          <Tooltip cursor={false} content={tooltip} />
          {series.map(({ dataKey, label, fill }) => (
            <Bar
              key={dataKey}
              dataKey={dataKey}
              name={label}
              stackId="stack"
              fill={fill}
              maxBarSize={MAX_BAR_SIZE}
              shape={(props: BarShapeProps) => (
                <Segment {...props} labelKey={labelKey} />
              )}
              radius={roundedKeys.includes(dataKey) ? TOP_RADIUS : 0}
            />
          ))}
          <Legend
            itemSorter={(item) => order.indexOf(String(item.dataKey))}
            formatter={legendLabel}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Plot width before the chart has measured itself. */
export const INITIAL_PLOT_WIDTH = INITIAL_WIDTH - AXIS_WIDTH - MARGIN.right;
