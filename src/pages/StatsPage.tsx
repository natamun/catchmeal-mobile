import { useState } from 'react';

import { CalorieChart } from '../components/analytics/CalorieChart';
import {
  MeasureChart,
  type MeasureKey,
} from '../components/analytics/MeasureChart';
import { NutritionAverages } from '../components/analytics/NutritionAverages';
import { lastDays } from '../components/analytics/period';
import { PeriodSelector } from '../components/analytics/PeriodSelector';
import { WeightVariation } from '../components/analytics/WeightVariation';
import { LoadError } from '../components/ui/LoadError';
import { useDashboard } from '../hooks/useDashboard';
import { toDateKey } from '../utils/dateKey';

/**
 * Stats page: a period, then averages, weight change, calorie chart, measure
 * chart, all from one dashboard request.
 */
export default function StatsPage() {
  const [period, setPeriod] = useState(() => lastDays(7));
  const [measure, setMeasure] = useState<MeasureKey>('weight');
  const from = toDateKey(period.from);
  const to = toDateKey(period.to);
  const { days, isLoading, hasError, retry } = useDashboard(from, to);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PeriodSelector period={period} onChange={setPeriod} />

      {hasError ? (
        <div className="rounded-2xl border border-theme-200 bg-surface shadow-sm">
          <LoadError
            message="Impossible de charger les statistiques."
            onRetry={retry}
          />
        </div>
      ) : (
        <div
          key={`${from}:${to}`}
          className="flex animate-fade-in-up flex-col gap-4 md:gap-6"
        >
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
            <NutritionAverages
              days={days}
              isLoading={isLoading}
              className="lg:col-span-2"
            />
            <WeightVariation days={days} isLoading={isLoading} />
          </div>

          <CalorieChart days={days} isLoading={isLoading} />
          <MeasureChart
            measure={measure}
            onMeasureChange={setMeasure}
            days={days}
            period={period}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
