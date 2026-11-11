import { useMemo, useState } from 'react';

import { AiContextCard } from '../components/analytics/AiContextCard';
import { CalorieChart } from '../components/analytics/CalorieChart';
import {
  MeasureChart,
  type MeasureKey,
} from '../components/analytics/MeasureChart';
import { lastDays } from '../components/analytics/period';
import { PeriodReport } from '../components/analytics/PeriodReport';
import { PeriodSelector } from '../components/analytics/PeriodSelector';
import { summarizePeriod } from '../components/analytics/periodSummary';
import { WeeklySessionsChart } from '../components/analytics/WeeklySessionsChart';
import { useProfile } from '../components/profile/profileContext';
import { Card } from '../components/ui/Card';
import { LoadError } from '../components/ui/LoadError';
import { useDashboard } from '../hooks/useDashboard';
import { useTraining } from '../hooks/useTraining';
import { toDateKey } from '../utils/dateKey';

/** Under three weeks, the sessions chart holds one or two bars: the count says it all. */
const MIN_SESSIONS_CHART_DAYS = 21;

/**
 * Stats page: a period, the summary of it in one block, then the calorie,
 * measure and sessions charts, and a summary to ask an AI.
 */
export default function StatsPage() {
  const [period, setPeriod] = useState(() => lastDays(7));
  const [measure, setMeasure] = useState<MeasureKey>('weight');
  const from = toDateKey(period.from);
  const to = toDateKey(period.to);
  const { days, isLoading, hasError, retry } = useDashboard(from, to);
  const training = useTraining(from, to);
  const { profile } = useProfile();
  const summary = useMemo(
    () => summarizePeriod(days, training.workouts, from, to, profile),
    [days, training.workouts, from, to, profile],
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PeriodSelector period={period} onChange={setPeriod} />

      {hasError ? (
        <Card flush>
          <LoadError
            message="Impossible de charger les statistiques."
            onRetry={retry}
          />
        </Card>
      ) : (
        <div
          key={`${from}:${to}`}
          className="flex animate-fade-in-up flex-col gap-4 md:gap-6"
        >
          <PeriodReport
            summary={summary}
            isLoading={isLoading || training.isLoading}
          />
          <CalorieChart days={days} from={from} to={to} isLoading={isLoading} />
          <MeasureChart
            measure={measure}
            onMeasureChange={setMeasure}
            days={days}
            period={period}
            isLoading={isLoading}
          />
          {summary.periodDays >= MIN_SESSIONS_CHART_DAYS && (
            <WeeklySessionsChart
              workouts={training.workouts}
              from={from}
              to={to}
              isLoading={training.isLoading}
            />
          )}
          <AiContextCard
            from={from}
            to={to}
            days={days}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
