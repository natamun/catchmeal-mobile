import { SummaryCard } from '../ui/SummaryCard';
import { progressScale } from './progress';

interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  isLoading?: boolean;
  unavailable?: boolean;
}

/**
 * Progress bar of one macro. Beyond the goal, the bar is the value, a notch
 * marks the goal and the excess after it takes the second accent.
 */
function Bar({
  label,
  value,
  goal,
  isLoading,
  unavailable,
}: {
  label: string;
  value: number;
  goal: number;
  isLoading: boolean;
  unavailable: boolean;
}) {
  const shown = isLoading || unavailable ? 0 : value;
  const { reached, goalAt } = progressScale(shown, goal);
  const excess = shown - goal;

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-theme-600">{label}</span>
        <span className="flex items-center gap-1 text-theme-600">
          {isLoading ? (
            <span className="h-4 w-8 animate-pulse rounded bg-theme-100" />
          ) : unavailable ? (
            '–'
          ) : (
            <span className="font-medium text-theme-800">{value}</span>
          )}
          <span>/ {goal} g</span>
          {excess > 0 && (
            <span className="font-medium text-accent-2">· +{excess}</span>
          )}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-theme-100">
        <div
          className="h-full bg-theme-400"
          style={{ width: `${Math.min(reached, goalAt) * 100}%` }}
        />
        {excess > 0 && (
          <div
            className="absolute inset-y-0 right-0 border-l-2 border-surface bg-accent-2"
            style={{ left: `${goalAt * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}

/** Protein, carbs and fat of the day against their goals. */
export function MacroBreakdown({
  protein,
  carbs,
  fat,
  proteinGoal,
  carbsGoal,
  fatGoal,
  isLoading = false,
  unavailable = false,
}: Macros) {
  return (
    <SummaryCard title="Macronutriments">
      <div className="flex flex-1 flex-col justify-between gap-4">
        <Bar
          label="Protéines"
          value={protein}
          goal={proteinGoal}
          isLoading={isLoading}
          unavailable={unavailable}
        />
        <Bar
          label="Glucides"
          value={carbs}
          goal={carbsGoal}
          isLoading={isLoading}
          unavailable={unavailable}
        />
        <Bar
          label="Lipides"
          value={fat}
          goal={fatGoal}
          isLoading={isLoading}
          unavailable={unavailable}
        />
      </div>
    </SummaryCard>
  );
}
