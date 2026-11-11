import { useState } from 'react';

import { startOfDay } from '../../utils/dateKey';
import { weeklySessions, type WeekSessions } from '../fitness/progress';
import type { Workout } from '../fitness/types';
import { SummaryCard } from '../ui/SummaryCard';
import { grainForWidth } from './buildDataGraph';
import { ChartSkeleton } from './ChartSkeleton';
import { SERIES_COLORS } from './chartStyle';
import { ChartTooltip } from './ChartTooltip';
import { INITIAL_PLOT_WIDTH, StackedBarChart } from './StackedBarChart';

const TITLE = 'Séances';
/** Lower than the other charts: a count of a few sessions needs little. */
const HEIGHT = 160;
const SERIES = [
  { dataKey: 'strength', label: 'Musculation', fill: SERIES_COLORS[0] },
  { dataKey: 'cardio', label: 'Cardio', fill: SERIES_COLORS[1] },
];
const ROUNDED = ['cardio'];

/** "02/11", the Monday of the week. */
const weekLabel = (weekStart: string) =>
  startOfDay(weekStart).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });

const dayMonth = (date: Date) =>
  date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/** "Semaine du 2 nov.", or "Du 2 au 15 nov." for two weeks. */
function barTitle(weekStart: string, weeks: number) {
  const start = startOfDay(weekStart);
  if (weeks === 1) return `Semaine du ${dayMonth(start)}`;
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 7 * weeks - 1,
  );
  return `Du ${dayMonth(start)} au ${dayMonth(end)}`;
}

/** Adds the weeks up two by two, from the first one. */
function pairWeeks(weeks: WeekSessions[]) {
  const pairs: WeekSessions[] = [];
  for (let i = 0; i < weeks.length; i += 2) {
    const [first, second] = weeks.slice(i, i + 2);
    pairs.push({
      weekStart: first.weekStart,
      strength: first.strength + (second?.strength ?? 0),
      cardio: first.cardio + (second?.cardio ?? 0),
    });
  }
  return pairs;
}

interface Props {
  workouts: Workout[];
  from: string;
  to: string;
  isLoading?: boolean;
}

/**
 * How many sessions each week of the period held, strength ones and cardio
 * ones stacked: the regularity at a glance. Weeks are added up two by two
 * when the period is too long for the width of the chart, like the calories.
 */
export function WeeklySessionsChart({
  workouts,
  from,
  to,
  isLoading = false,
}: Props) {
  const [plotWidth, setPlotWidth] = useState(INITIAL_PLOT_WIDTH);

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

  const weeksPerBar =
    grainForWidth(plotWidth, from, to, false) === 'biWeek' ? 2 : 1;
  const weekly = weeklySessions(workouts, from, to);
  const weeks = weeksPerBar === 2 ? pairWeeks(weekly) : weekly;
  const top = Math.max(2, ...weeks.map((w) => w.strength + w.cardio));
  const step = top > 8 ? 2 : 1;
  const ticks = Array.from(
    { length: Math.ceil(top / step) + 1 },
    (_, i) => i * step,
  );

  return (
    <SummaryCard
      title={TITLE}
      aside={
        <span className="text-sm text-theme-600">
          {weeksPerBar === 2 ? 'Par 2 semaines' : 'Par semaine'}
        </span>
      }
    >
      <StackedBarChart
        data={weeks}
        labelKey="weekStart"
        series={SERIES}
        roundedKeys={ROUNDED}
        ticks={ticks}
        tickFormatter={weekLabel}
        tooltip={(props) => (
          <ChartTooltip
            {...props}
            label={barTitle(String(props.label), weeksPerBar)}
          />
        )}
        height={HEIGHT}
        onPlotWidth={setPlotWidth}
      />
    </SummaryCard>
  );
}
