import type { ReactNode } from 'react';

import { GoalBar } from '../home/DaySummary';
import { Skeleton } from '../ui/Skeleton';
import { perWeekLabel, sessionsPhrase, weightSpan } from './periodPhrases';
import type { PeriodSummary } from './periodSummary';

/** Under half of the days logged, the averages are worth a warning. */
const THIN_TRACKING = 0.5;

const formatNumber = (value: number) => value.toLocaleString('fr-FR');

function Part({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-theme-100 pt-4 first:border-t-0 first:pt-0">
      {children}
    </div>
  );
}

/** A part's label on the left, its figures on the right. */
function Row({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium text-theme-500">{label}</span>
      {children}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm text-theme-600">{children}</p>;
}

interface Props {
  summary: PeriodSummary;
  isLoading: boolean;
}

/**
 * The period in one block, like the top of the journal: the average calories
 * over a bar to the goal and a weekday against a weekend day, the protein,
 * the weight's first and last weigh-ins with its pace, and the sessions per
 * week.
 */
export function PeriodReport({ summary, isLoading }: Props) {
  if (isLoading) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-theme-200 bg-surface p-5 shadow-sm">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-4 w-48" />
      </section>
    );
  }

  const { kcal, protein, weight, weekSplit, loggedDays, countableDays } =
    summary;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-theme-200 bg-surface p-5 shadow-sm">
      <Part>
        <Row label="Calories par jour" />
        {kcal === null ? (
          <Note>Aucun repas enregistré sur cette période.</Note>
        ) : (
          <>
            <p className="flex items-baseline gap-2 tabular-nums">
              <span className="text-4xl font-bold text-theme-800">
                {formatNumber(kcal.average)}
              </span>
              <span className="text-sm text-theme-600">
                {kcal.goal === null
                  ? 'kcal'
                  : `/ ${formatNumber(kcal.goal)} kcal`}
              </span>
            </p>
            {kcal.goal !== null && (
              <GoalBar value={kcal.average} goal={kcal.goal} height="h-3" />
            )}
            {weekSplit && (
              <p className="text-sm text-theme-600 tabular-nums">
                Semaine{' '}
                <span className="font-semibold text-theme-800">
                  {formatNumber(weekSplit.week)}
                </span>
                {' · '}Week-end{' '}
                <span className="font-semibold text-theme-800">
                  {formatNumber(weekSplit.weekend)}
                </span>
              </p>
            )}
            {loggedDays < countableDays * THIN_TRACKING && (
              <Note>
                Seulement {loggedDays} jours notés sur {countableDays} : la
                moyenne est peu fiable.
              </Note>
            )}
          </>
        )}
      </Part>

      {protein !== null && (
        <Part>
          <Row label="Protéines par jour">
            <span className="shrink-0 text-sm text-theme-600 tabular-nums">
              <span className="font-semibold text-theme-800">
                {protein.average}
              </span>
              {protein.goal !== null && ` / ${protein.goal}`} g
            </span>
          </Row>
          {protein.goal !== null && (
            <GoalBar
              value={protein.average}
              goal={protein.goal}
              height="h-1.5"
            />
          )}
        </Part>
      )}

      <Part>
        <Row label="Poids">
          {weight === null ? (
            <span className="text-sm text-theme-600">Aucune pesée</span>
          ) : (
            <span className="flex min-w-0 items-baseline gap-3 text-sm tabular-nums">
              <span className="truncate text-theme-600">
                {weightSpan(weight)}
              </span>
              {weight.perWeek !== null && (
                <span className="shrink-0 font-semibold text-theme-800">
                  {perWeekLabel(weight.perWeek)}
                </span>
              )}
            </span>
          )}
        </Row>
      </Part>

      <Part>
        <Row label="Séances">
          <span className="text-sm font-semibold text-theme-800 tabular-nums">
            {sessionsPhrase(summary.sessions)}
          </span>
        </Row>
      </Part>
    </section>
  );
}
