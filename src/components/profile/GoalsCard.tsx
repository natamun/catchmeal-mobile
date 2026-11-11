import { useRef, useState } from 'react';
import { ChevronDown, TriangleAlert } from 'lucide-react';

import { formatKg, formatShortDate } from '../../utils/format';
import { Card } from '../ui/Card';
import { ChevronRow } from '../ui/ChevronRow';
import { PillTabs } from '../ui/PillTabs';
import { SelectDropdown } from '../ui/SelectDropdown';
import { Skeleton } from '../ui/Skeleton';
import type { Profile, WeightEntry } from './api';
import { GoalDialog } from './GoalDialog';
import { GOAL_TYPE_OPTIONS } from './goalTypes';
import { formatMeasure } from './measures';
import type { Goals } from './useGoals';

interface Props {
  goals: Goals;
  profile: Profile;
  /** Every weigh-in, the latest first, or null while they are read. */
  history: WeightEntry[] | null;
  onUpdate: (partial: Partial<Profile>) => void;
}

/**
 * The goal type and its weekly pace, both changed in place: the type in a
 * full-width select, the pace as pills from slowest to fastest, with what it
 * means in kg for the latest weight.
 */
function GoalPicker({
  goals,
  weight,
}: {
  goals: Goals;
  weight: number | undefined;
}) {
  const paces = [...goals.paces].sort((a, b) => a - b);
  const weeklyKg =
    weight === undefined || goals.pace === 0
      ? null
      : Math.round(weight * goals.pace) / 100;
  return (
    <div className="flex flex-col gap-2">
      <SelectDropdown
        title="Objectif"
        value={goals.goalType}
        options={GOAL_TYPE_OPTIONS}
        onChange={(value) => void goals.saveGoalType(value)}
      />
      {paces.length > 1 && (
        <PillTabs
          name="goal-pace"
          options={paces.map((pace) => ({
            value: String(pace),
            label: `${pace.toLocaleString('fr-FR')} %`,
          }))}
          value={String(goals.pace)}
          onChange={(value) => void goals.savePace(value)}
          fill
        />
      )}
      {weeklyKg !== null && (
        <p className="text-xs text-theme-600">
          ≈ {formatKg(weeklyKg)} kg par semaine
        </p>
      )}
    </div>
  );
}

/** Where the current weight stands from the goal's start to its target. */
function GoalProgress({
  start,
  current,
  target,
  reachDate,
}: {
  start: number;
  current: number;
  target: number;
  reachDate: Date | null;
}) {
  const progress = Math.min(
    1,
    Math.max(0, (start - current) / (start - target)),
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-2 rounded-full bg-theme-100">
        <div
          className="h-full rounded-full bg-theme-500"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-theme-500"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
      <div className="flex justify-between gap-3 text-xs text-theme-600 tabular-nums">
        <span>Départ {formatMeasure(start, 'kg')}</span>
        <span className="text-right">
          Cible {formatMeasure(target, 'kg')}
          {reachDate && (
            <span className="font-semibold text-theme-800">
              {' · '}
              {formatShortDate(reachDate)}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/** The notes on how the goals are computed, folded. */
function HowItWorks({ notes }: { notes: (string | null)[] }) {
  const shown = notes.filter((note): note is string => note !== null);
  if (shown.length === 0) return null;
  return (
    <details className="group -mx-2">
      <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-2 text-sm font-medium text-theme-500 transition-colors hover:bg-theme-100 [&::-webkit-details-marker]:hidden">
        <span className="flex-1">Comment c'est calculé</span>
        <ChevronDown className="h-4 w-4 text-theme-600 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="flex flex-col gap-2 px-2 pt-1 pb-2 text-sm leading-relaxed text-pretty text-theme-600">
        {shown.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </details>
  );
}

/** Current goals against recommended ones, when there are some. */
function GoalsTable({ goals }: { goals: Goals }) {
  const hasRecommendation = goals.recommendation !== null;
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-xs text-theme-600">
          <th className="pb-2 text-left font-medium" />
          <th className="pb-2 text-right font-medium">Actuel</th>
          {hasRecommendation && (
            <th className="pb-2 text-right font-medium">Recommandé</th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-theme-100">
        {goals.rows.map(({ label, unit, goal, recommended }) => (
          <tr key={label}>
            <td className="py-2.5 text-theme-700">{label}</td>
            <td className="py-2.5 text-right font-semibold text-theme-800">
              {formatMeasure(goal, unit)}
            </td>
            {hasRecommendation && (
              <td className="py-2.5 text-right font-semibold text-accent-2">
                {formatMeasure(recommended, unit)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The goal card (see useGoals): what is left to reach the target, the way
 * from the start to it, the current goals against the recommended ones, and
 * how they are computed, folded. The goal type and pace change in place; the
 * target and the daily goals in a dialog.
 */
export function GoalsCard({ goals, profile, history, onUpdate }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);
  const latest = history?.[0];
  const began = goals.goalBegan;
  const start =
    history && began
      ? history
          .filter((entry) => Date.parse(entry.loggedAt) >= began.getTime())
          .at(-1)
      : undefined;
  const target = goals.targetWeight;
  const hasBar =
    start !== undefined &&
    latest !== undefined &&
    target !== null &&
    start.weight !== target;
  // Without the bar, the date joins the aim.
  const aim = hasBar
    ? goals.aimText
    : [
        goals.aimText,
        goals.reachDate ? `vers le ${formatShortDate(goals.reachDate)}` : null,
      ]
        .filter(Boolean)
        .join(', ') || null;

  const openDialog = () => {
    setOpenCount((count) => count + 1);
    dialogRef.current?.showModal();
  };

  return (
    <>
      <Card title="Mon objectif">
        {goals.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="-mb-3 flex flex-col gap-4">
            <GoalPicker goals={goals} weight={latest?.weight} />
            {!goals.recommendation && (
              <p className="text-sm text-theme-600">
                Complétez votre profil et ajoutez une pesée pour obtenir des
                recommandations.
              </p>
            )}
            {goals.recommendation && goals.remainingHead && (
              <div className="flex flex-col gap-3">
                <p className="text-2xl font-bold text-theme-800">
                  {goals.remainingHead}
                </p>
                {hasBar && (
                  <GoalProgress
                    start={start.weight}
                    current={latest.weight}
                    target={target}
                    reachDate={goals.reachDate}
                  />
                )}
                {aim && <p className="text-sm text-theme-600">{aim}</p>}
              </div>
            )}
            {goals.bodyFatHint && (
              <p className="text-sm text-theme-600">{goals.bodyFatHint}</p>
            )}
            {goals.alertText && (
              <p className="flex gap-2 rounded-lg border border-theme-200 bg-theme-50 px-3 py-2 text-sm text-theme-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-theme-600" />
                {goals.alertText}
              </p>
            )}
            <GoalsTable goals={goals} />
            <div className="flex flex-col">
              <ChevronRow label="Modifier les objectifs" onClick={openDialog} />
              {goals.recommendation && (
                <HowItWorks
                  notes={[
                    goals.changeText,
                    goals.expenditureText,
                    goals.waterNote,
                    goals.proteinText,
                    goals.limitNote,
                  ]}
                />
              )}
            </div>
          </div>
        )}
      </Card>

      <GoalDialog
        dialogRef={dialogRef}
        openCount={openCount}
        profile={profile}
        onUpdate={onUpdate}
      />
    </>
  );
}
