import { useEffect, useState } from 'react';

import type { MeasuredExpenditure } from '../../data/energy';
import {
  estimateReachDate,
  PACES,
  recommendGoals,
  suggestGoalType,
  type GoalType,
} from '../../data/goals';
import { formatKg } from '../../utils/format';
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
export function GoalsCard({ profile, latestEntry }: Props) {
  const [paceChoice, setPaceChoice] = useState<string | null>(null);
  const [measured, setMeasured] = useState<MeasuredExpenditure | null>(null);
  const isLoading = latestEntry === undefined;
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

  const renderBasis = () => {
    if (isLoading) {
      return <Skeleton className="h-5 w-48" />;
    }
    if (!recommendation || !expenditure) {
      return 'Complétez le profil et ajoutez une pesée pour obtenir des recommandations.';
    }

    return (
      <>
        <span className="inline-flex items-center gap-1.5 align-middle whitespace-nowrap">
          {goalLabel}
          {paces.length > 1 && (
            <>
              {' à '}
              <SelectDropdown
                size="sm"
                value={String(pace)}
                options={paces.map((option) => ({
                  value: String(option),
                  label: formatPace(option),
                }))}
                onChange={setPaceChoice}
                container={document.body}
              />
            </>
          )}
        </span>
        <span className="mt-1 block">
          {measured
            ? `Dépense mesurée sur vos ${measured.loggedDays} derniers jours : ${formatMeasure(expenditure, 'kcal')}`
            : `Dépense estimée : ${formatMeasure(expenditure, 'kcal')} (mesurée après 2 semaines de journal)`}
        </span>
        {recommendation.limitedByBmr && (
          <span className="mt-1 block">
            Rythme limité : les calories ne descendent pas sous le métabolisme
            de base.
          </span>
        )}
      </>
    );
  };

  return (
    <SummaryCard
      title="Mes objectifs"
      aside={
        <div className="text-sm text-green-600">
          {remaining && (
            <p className="font-semibold text-green-800">{remaining}</p>
          )}
          <div>{renderBasis()}</div>
        </div>
      }
    >
      <dl className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
        {rows.map(({ label, unit, goal, recommended }) => (
          <StatTile key={label} label={label}>
            {recommended === null ? (
              formatMeasure(goal, unit)
            ) : (
              <>
                {goal === null ? '–' : formatKg(goal)}{' '}
                <span className="font-normal whitespace-nowrap text-green-600">
                  / {formatMeasure(recommended, unit)}
                </span>
              </>
            )}
          </StatTile>
        ))}
      </dl>
    </SummaryCard>
  );
}
