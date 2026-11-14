import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { formatKg } from '../../utils/format';
import { Card } from '../ui/Card';
import { progressScale } from './progress';

interface Props {
  consumed: number;
  goal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbsGoal: number;
  fat: number;
  fatGoal: number;
  isLoading: boolean;
  unavailable: boolean;
  /** Weigh-ins, newest first; null while they load. */
  weightHistory: { weight: number; loggedAt: string }[] | null;
  weightError: boolean;
  goalWeight: number | null;
}

const MACROS = [
  { key: 'protein', label: 'Protéines' },
  { key: 'carbs', label: 'Glucides' },
  { key: 'fat', label: 'Lipides' },
] as const;

const formatNumber = (value: number) => value.toLocaleString('fr-FR');

/**
 * Progress against a goal in the accent. Beyond the goal, the bar is the value:
 * the accent stops square at the goal and the excess takes the second accent.
 */
export function GoalBar({
  value,
  goal,
  height,
}: {
  value: number;
  goal: number;
  height: string;
}) {
  const { reached, goalAt } = progressScale(value, goal);
  const over = value > goal;
  return (
    <div
      className={`relative ${height} overflow-hidden rounded-full bg-theme-100`}
    >
      <div
        className={`h-full bg-theme-500 transition-[width] duration-500 ease-out ${over ? '' : 'rounded-full'}`}
        style={{ width: `${Math.min(reached, goalAt) * 100}%` }}
      />
      {over && (
        <div
          className="absolute inset-y-0 right-0 border-l-2 border-surface bg-accent-2"
          style={{ left: `${goalAt * 100}%` }}
        />
      )}
    </div>
  );
}

/** Latest weigh-in, its change since the previous one, and the gap to the goal. */
function WeightLine({
  history,
  hasError,
  goalWeight,
}: {
  history: Props['weightHistory'];
  hasError: boolean;
  goalWeight: number | null;
}) {
  if (hasError) {
    return (
      <p className="text-sm text-theme-600">
        Impossible de charger les pesées.
      </p>
    );
  }
  if (history === null) {
    return <div className="h-7 w-48 animate-pulse rounded bg-theme-100" />;
  }
  const current = history[0] ?? null;
  if (current === null) {
    return <p className="text-sm text-theme-600">Aucune pesée enregistrée.</p>;
  }

  const previous = history[1] ?? null;
  const change = previous ? current.weight - previous.weight : null;
  const stable = change !== null && Math.abs(change) < 0.05;
  const TrendIcon =
    change === null || stable ? Minus : change > 0 ? TrendingUp : TrendingDown;
  const gap = goalWeight === null ? null : current.weight - goalWeight;

  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-theme-500">Poids</span>
        <span className="text-lg font-bold text-theme-800">
          {formatKg(current.weight)} kg
        </span>
        {change !== null && (
          <span className="flex items-center gap-1 self-center text-xs text-theme-600">
            <TrendIcon className="h-3.5 w-3.5" />
            {stable
              ? 'stable'
              : `${change > 0 ? '+' : '−'}${formatKg(Math.abs(change))}`}
          </span>
        )}
      </p>
      <span className="truncate text-sm text-theme-600">
        {gap === null
          ? 'Objectif non défini'
          : Math.abs(gap) < 0.05
            ? 'Objectif atteint'
            : `${gap > 0 ? 'reste' : 'à prendre'} ${formatKg(Math.abs(gap))} kg`}
      </span>
    </div>
  );
}

/**
 * The top of the journal in one block: the calories left as the headline over
 * a bar, the three macros in columns, and the latest weigh-in on one line.
 */
export function DaySummary(props: Props) {
  const { consumed, goal, isLoading, unavailable } = props;
  const empty = isLoading || unavailable;
  const over = consumed > goal;
  const figure = isLoading
    ? '…'
    : unavailable
      ? '–'
      : formatNumber(Math.abs(goal - consumed));
  const label = unavailable
    ? 'indisponible'
    : over
      ? 'kcal en trop'
      : 'kcal restantes';
  const macros = {
    protein: { value: props.protein, goal: props.proteinGoal },
    carbs: { value: props.carbs, goal: props.carbsGoal },
    fat: { value: props.fat, goal: props.fatGoal },
  };

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-theme-800 tabular-nums">
              {figure}
            </span>
            <span className="text-sm text-theme-600">{label}</span>
          </p>
          <span className="shrink-0 text-sm text-theme-600 tabular-nums">
            {empty ? '–' : formatNumber(consumed)} / {formatNumber(goal)}
          </span>
        </div>
        <GoalBar value={empty ? 0 : consumed} goal={goal} height="h-3" />
      </div>
      <dl className="grid grid-cols-3 gap-4">
        {MACROS.map(({ key, label: macroLabel }) => {
          const value = empty ? 0 : macros[key].value;
          return (
            <div key={key} className="flex min-w-0 flex-col gap-1.5">
              <dt className="truncate text-xs font-medium text-theme-500">
                {macroLabel}
              </dt>
              <dd className="text-sm text-theme-600 tabular-nums">
                <span className="font-semibold text-theme-800">
                  {empty ? '–' : value}
                </span>{' '}
                / {macros[key].goal} g
              </dd>
              <GoalBar value={value} goal={macros[key].goal} height="h-1.5" />
            </div>
          );
        })}
      </dl>
      {/* As tall as a journal section's title row (52 px): 12 px each side,
          the card's bottom padding pulled up by 8. */}
      <div className="-mb-2 border-t border-theme-100 pt-3">
        <WeightLine
          history={props.weightHistory}
          hasError={props.weightError}
          goalWeight={props.goalWeight}
        />
      </div>
    </Card>
  );
}
