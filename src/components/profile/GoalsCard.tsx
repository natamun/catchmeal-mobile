import { useEffect, useState } from 'react';

import type { MeasuredExpenditure } from '../../data/energy';
import {
  estimateReachDate,
  PACES,
  recommendGoals,
  suggestGoalType,
  type GoalType,
} from '../../data/goals';
import { SelectDropdown } from '../ui/SelectDropdown';
import { Skeleton } from '../ui/Skeleton';
import { StatTile } from '../ui/StatTile';
import { SummaryCard } from '../ui/SummaryCard';
import { getMeasuredExpenditure, type Profile, type WeightEntry } from './api';
import { calculateBMR, calculateTDEE, fatFreeMassOf } from './bmr';
import { GOAL_TYPE_OPTIONS } from './goalTypes';
import { formatMeasure } from './measures';

interface Props {
  profile: Profile;
  latestEntry: WeightEntry | null | undefined;
  /** Called once the measured expenditure has been read the first time. */
  onReady?: () => void;
}

const formatPace = (pace: number) => `${pace.toLocaleString('fr-FR')} %/sem.`;

const formatDay = (date: Date) =>
  date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/**
 * Current goals next to recommended ones. The recommendation (data/goals.ts)
 * starts from the daily expenditure: measured from the journal when there is
 * enough of it, otherwise estimated from the BMR and the activity level. The
 * goal type and the weekly pace set the deficit or surplus.
 */
export function GoalsCard({ profile, latestEntry, onReady }: Props) {
  const [paceChoice, setPaceChoice] = useState<string | null>(null);
  // undefined while it is read, null when there is not enough journal.
  const [measured, setMeasured] = useState<MeasuredExpenditure | null>();
  const isLoading = latestEntry === undefined || measured === undefined;
  const latestWeight = latestEntry?.weight;

  // A new weigh-in can change the measure: read it again with each one.
  useEffect(() => {
    let cancelled = false;
    getMeasuredExpenditure()
      .then((result) => {
        if (!cancelled) setMeasured(result);
      })
      .catch(() => {
        if (!cancelled) setMeasured(null);
      });
    return () => {
      cancelled = true;
    };
  }, [latestEntry]);

  const isMeasureRead = measured !== undefined;
  useEffect(() => {
    if (isMeasureRead) onReady?.();
  }, [isMeasureRead, onReady]);

  const bmr =
    latestWeight && profile.height && profile.birthDate && profile.gender
      ? calculateBMR(
          latestWeight,
          profile.height,
          profile.birthDate,
          profile.gender,
          latestEntry ? fatFreeMassOf(latestEntry) : null,
        )
      : null;
  const estimated =
    bmr && profile.activityLevel
      ? calculateTDEE(bmr, profile.activityLevel)
      : null;
  const expenditure = measured?.kcal ?? estimated;

  const goalType =
    (profile.goalType as GoalType | null) ??
    (latestWeight
      ? suggestGoalType(latestWeight, profile.targetWeight)
      : 'MAINTAIN');
  const paces = PACES[goalType];
  const pace =
    paceChoice !== null && paces.includes(Number(paceChoice))
      ? Number(paceChoice)
      : paces[0];

  const recommendation =
    latestWeight && bmr && expenditure
      ? recommendGoals({
          weight: latestWeight,
          bmr,
          expenditure,
          goalType,
          pace,
        })
      : null;

  const rows = [
    {
      label: 'Calories',
      unit: 'kcal',
      goal: profile.dailyCalorieGoal,
      recommended: recommendation?.kcal ?? null,
    },
    {
      label: 'Protéines',
      unit: 'g',
      goal: profile.dailyProteinGoal,
      recommended: recommendation?.protein ?? null,
    },
    {
      label: 'Glucides',
      unit: 'g',
      goal: profile.dailyCarbsGoal,
      recommended: recommendation?.carbs ?? null,
    },
    {
      label: 'Lipides',
      unit: 'g',
      goal: profile.dailyFatGoal,
      recommended: recommendation?.fat ?? null,
    },
  ];

  const gap =
    latestWeight && profile.targetWeight
      ? latestWeight - profile.targetWeight
      : null;
  const reachDate =
    recommendation && latestWeight && profile.targetWeight
      ? estimateReachDate(
          latestWeight,
          profile.targetWeight,
          recommendation.weeklyChangeKg,
          new Date(),
        )
      : null;
  const remaining =
    gap === null
      ? null
      : Math.abs(gap) < 0.05
        ? 'Poids cible atteint'
        : `${formatMeasure(Math.abs(gap), 'kg')} ${gap > 0 ? 'à perdre' : 'à prendre'}${reachDate ? `, vers le ${formatDay(reachDate)}` : ''}`;

  const goalLabel = GOAL_TYPE_OPTIONS.find((o) => o.value === goalType)?.label;

  const paceSelect =
    paces.length > 1 ? (
      <SelectDropdown
        size="sm"
        value={String(pace)}
        options={paces.map((option) => ({
          value: String(option),
          label: formatPace(option),
        }))}
        onChange={setPaceChoice}
        container={document.body}
        className="min-w-0 flex-1 whitespace-nowrap"
      />
    ) : null;

  const expenditureText = measured
    ? `Dépense mesurée sur ${measured.loggedDays} jours : ${formatMeasure(measured.kcal, 'kcal')}`
    : expenditure
      ? `Dépense estimée : ${formatMeasure(expenditure, 'kcal')}, mesurée après 2 semaines de journal`
      : null;

  const limitNote = recommendation?.limitedByBmr
    ? 'Rythme limité : les calories ne descendent pas sous le métabolisme de base.'
    : null;

  if (isLoading || !recommendation) {
    return (
      <SummaryCard title="Mes objectifs">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <p className="text-sm text-theme-600">
              Complétez le profil et ajoutez une pesée pour obtenir des
              recommandations.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {rows.map(({ label, unit, goal }) => (
                <StatTile key={label} label={label}>
                  {formatMeasure(goal, unit)}
                </StatTile>
              ))}
            </dl>
          </>
        )}
      </SummaryCard>
    );
  }

  return (
    <SummaryCard
      title="Mes objectifs"
      aside={
        <span className="flex min-w-0 flex-1 basis-56 items-center gap-2 text-sm font-medium text-theme-700">
          <span className="whitespace-nowrap">{goalLabel}</span>
          {paceSelect}
        </span>
      }
    >
      {remaining && (
        <p className="text-sm font-semibold text-theme-800">{remaining}</p>
      )}
      {expenditureText && (
        <p className="text-xs text-theme-600">{expenditureText}</p>
      )}
      {limitNote && <p className="text-xs text-theme-600">{limitNote}</p>}
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-xs text-theme-500">
            <th className="pb-2 text-left font-medium" />
            <th className="pb-2 text-right font-medium">Actuel</th>
            <th className="pb-2 text-right font-medium">Recommandé</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-theme-100">
          {rows.map(({ label, unit, goal, recommended }) => (
            <tr key={label}>
              <td className="py-2.5 text-theme-700">{label}</td>
              <td className="py-2.5 text-right font-semibold text-theme-800">
                {formatMeasure(goal, unit)}
              </td>
              <td className="py-2.5 text-right font-semibold text-accent-2">
                {formatMeasure(recommended, unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SummaryCard>
  );
}
