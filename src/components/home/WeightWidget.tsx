import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { formatKg } from '../../utils/format';
import { StatTile } from '../ui/StatTile';
import { SummaryCard } from '../ui/SummaryCard';

interface Props {
  history: { weight: number; loggedAt: string }[] | null;
  hasError?: boolean;
  goalWeight: number | null;
}

/** A day such as "1er oct." or "20 oct.". */
function formatDay(isoDate: string) {
  const date = new Date(isoDate);
  const day = date.getDate();
  const month = date.toLocaleDateString('fr-FR', { month: 'short' });
  return `${day === 1 ? '1er' : day} ${month}`;
}

/**
 * Latest weigh-in, its change since the previous one, and what is left to reach
 * the target weight.
 */
export function WeightWidget({ history, hasError = false, goalWeight }: Props) {
  const isLoading = history === null && !hasError;
  const current = history?.[0] ?? null;
  const previous = history?.[1] ?? null;

  const change =
    current === null || previous === null
      ? null
      : current.weight - previous.weight;
  const stable = change !== null && Math.abs(change) < 0.05;
  const TrendIcon =
    change === null || stable ? Minus : change > 0 ? TrendingUp : TrendingDown;

  const gap =
    current === null || goalWeight === null
      ? null
      : current.weight - goalWeight;
  const reached = gap !== null && Math.abs(gap) < 0.05;

  return (
    <SummaryCard title="Poids & Objectif">
      {isLoading && (
        <div className="flex animate-pulse flex-col gap-2">
          <div className="h-10 w-24 rounded-lg bg-theme-100" />
          <div className="h-4 w-40 rounded bg-theme-100" />
        </div>
      )}
      {hasError && (
        <p className="text-sm text-theme-600">
          Impossible de charger les pesées.
        </p>
      )}
      {history !== null && current === null && (
        <p className="text-sm text-theme-600">Aucune pesée enregistrée.</p>
      )}
      {current !== null && (
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-theme-800">
              {formatKg(current.weight)}
            </span>
            <span className="mb-1 text-theme-600">kg</span>
          </div>
          {previous !== null && change !== null && (
            <div className="mb-1 text-right">
              <p className="flex items-center justify-end gap-1 text-sm font-semibold text-theme-800">
                <TrendIcon className="h-4 w-4 shrink-0" />
                {stable
                  ? 'Stable'
                  : `${change > 0 ? '+' : '−'}${formatKg(Math.abs(change))} kg`}
              </p>
              <p className="text-xs text-theme-600">
                depuis le {formatDay(previous.loggedAt)}
              </p>
            </div>
          )}
        </div>
      )}
      <dl className="mt-auto grid grid-cols-2 gap-3 pt-4">
        <StatTile label="Objectif">
          {goalWeight === null ? 'Non défini' : `${formatKg(goalWeight)} kg`}
        </StatTile>
        {gap !== null && (
          <StatTile
            label={
              reached
                ? 'Statut'
                : gap > 0
                  ? 'Reste à perdre'
                  : 'Reste à prendre'
            }
          >
            {reached ? 'Atteint' : `${formatKg(Math.abs(gap))} kg`}
          </StatTile>
        )}
      </dl>
    </SummaryCard>
  );
}
