import { StatTile } from '../ui/StatTile';
import { SummaryCard } from '../ui/SummaryCard';
import { progressLaps } from './progress';

interface Props {
  consumed: number;
  goal: number;
  isLoading?: boolean;
  unavailable?: boolean;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Calories of the day in a ring: the calories left, or the excess drawn as a
 * second lap in another color.
 */
export function CalorieSummary({
  consumed,
  goal,
  isLoading = false,
  unavailable = false,
}: Props) {
  const over = consumed > goal;
  const difference = Math.abs(goal - consumed);
  const { lap, extraLap } = progressLaps(
    isLoading || unavailable ? 0 : consumed,
    goal,
  );

  return (
    <SummaryCard title="Calories du jour">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              className="stroke-theme-100"
            />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              strokeDasharray={`${lap * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              className="stroke-theme-400"
            />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              strokeDasharray={`${extraLap * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              className="stroke-theme-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isLoading ? (
              <span className="h-7 w-12 animate-pulse rounded bg-theme-100" />
            ) : (
              <p className="flex flex-col items-center leading-tight">
                <span className="text-2xl font-bold text-theme-800">
                  {unavailable ? '–' : difference}
                </span>
                <span className="text-xs text-theme-600">
                  {unavailable
                    ? 'indisponible'
                    : over
                      ? 'en trop'
                      : 'restantes'}
                </span>
              </p>
            )}
          </div>
        </div>
        <dl className="flex min-w-0 flex-1 flex-col gap-3">
          <StatTile label="Objectif">
            {goal}
            <span className="max-2xs:hidden"> kcal</span>
          </StatTile>
          <StatTile label="Consommées">
            {isLoading ? (
              <span className="block h-6 w-16 animate-pulse rounded bg-theme-100" />
            ) : unavailable ? (
              '–'
            ) : (
              <>
                {consumed}
                <span className="max-2xs:hidden"> kcal</span>
              </>
            )}
          </StatTile>
        </dl>
      </div>
    </SummaryCard>
  );
}
