import { useMemo, useState } from 'react';

import { SummaryCard } from '../ui/SummaryCard';
import { buildDataGraph, grainForWidth } from './buildDataGraph';
import { ChartSkeleton } from './ChartSkeleton';
import { MACRO_SERIES, UNSPLIT_SERIES } from './macroSeries';
import { MacroTooltip } from './MacroTooltip';
import { INITIAL_PLOT_WIDTH, StackedBarChart } from './StackedBarChart';
import type { DashboardDay, DataGraph, Grain, KcalPoint } from './types';

const TITLE = 'Calories et macronutriments';
const GRAIN_CAPTION: Record<Grain, string> = {
  day: 'Par jour',
  week: 'Moyenne par semaine',
  biWeek: 'Moyenne sur 2 semaines',
};

const SCALE_STEPS = [50, 100, 250, 500, 1000, 1500, 2000, 2500, 5000];
const MAX_INTERVALS = 5;
const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;
const ALL_SERIES = [...MACRO_SERIES, UNSPLIT_SERIES];
const TOP_SERIES = [
  MACRO_SERIES[MACRO_SERIES.length - 1].dataKey,
  UNSPLIT_SERIES.dataKey,
];

/**
 * Round graduations for the calorie axis: the step (50, 100... 5000) that
 * covers `max` in 5 intervals or fewer with the lowest top.
 */
function scaleTicks(max: number) {
  const largestStep = SCALE_STEPS[SCALE_STEPS.length - 1];
  const fallback = {
    step: largestStep,
    count: Math.max(1, Math.ceil(max / largestStep)),
  };
  const { step, count } = SCALE_STEPS.map((candidate) => ({
    step: candidate,
    count: Math.max(1, Math.ceil(max / candidate)),
  }))
    .filter((candidate) => candidate.count <= MAX_INTERVALS)
    .reduce(
      (best, candidate) =>
        candidate.step * candidate.count < best.step * best.count
          ? candidate
          : best,
      fallback,
    );

  return {
    ticks: Array.from({ length: count + 1 }, (_, index) => index * step),
    top: step * count,
  };
}

/**
 * Shares a bar's calories between the macros in proportion to their calories
 * (4, 4 and 9 kcal per gram). A bar without any macro goes entirely to "Non
 * réparti".
 */
function splitByMacro(point: DataGraph): KcalPoint {
  const protein = point.protein * KCAL_PER_GRAM.protein;
  const carbs = point.carbs * KCAL_PER_GRAM.carbs;
  const fat = point.fat * KCAL_PER_GRAM.fat;
  const total = protein + carbs + fat;
  const scale = total > 0 ? point.kcal / total : 0;

  return {
    ...point,
    proteinKcal: protein * scale,
    carbsKcal: carbs * scale,
    fatKcal: fat * scale,
    otherKcal: total > 0 ? 0 : point.kcal,
  };
}

interface Props {
  days: DashboardDay[];
  /** The period (YYYY-MM-DD): every calendar day of it gets its place. */
  from: string;
  to: string;
  isLoading?: boolean;
}

/**
 * Stacked bar chart of the calories per day, split by macro. Days are grouped by calendar week or two weeks when
 * the period is too long for the width of the chart.
 */
export function CalorieChart({ days, from, to, isLoading = false }: Props) {
  const [plotWidth, setPlotWidth] = useState(INITIAL_PLOT_WIDTH);

  const grain = useMemo<Grain>(
    () => grainForWidth(plotWidth, from, to),
    [plotWidth, from, to],
  );

  const data = useMemo<DataGraph[]>(
    () => buildDataGraph(days, from, to, grain),
    [days, from, to, grain],
  );

  const kcalData = useMemo(() => data.map(splitByMacro), [data]);

  const kcalScale = useMemo(
    () => scaleTicks(Math.max(0, ...data.map((point) => point.kcal))),
    [data],
  );

  const series = kcalData.some((point) => point.otherKcal > 0)
    ? ALL_SERIES
    : MACRO_SERIES;
  const averaged = grain !== 'day';

  if (isLoading) {
    return (
      <SummaryCard title={TITLE}>
        <ChartSkeleton />
      </SummaryCard>
    );
  }

  return (
    <SummaryCard
      title={TITLE}
      aside={
        <span className="text-sm text-theme-600">{GRAIN_CAPTION[grain]}</span>
      }
    >
      <StackedBarChart
        data={kcalData}
        labelKey="from"
        series={series}
        roundedKeys={TOP_SERIES}
        ticks={kcalScale.ticks}
        tooltip={(props) => <MacroTooltip {...props} averaged={averaged} />}
        onPlotWidth={setPlotWidth}
      />
    </SummaryCard>
  );
}
