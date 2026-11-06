import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';

import {
  compositionAlert,
  compositionChange,
  effectiveTargetWeight,
  fatFreeMassOf,
  latestComposition,
  type CompositionAlert,
} from '../../data/composition';
import type { MeasuredExpenditure } from '../../data/energy';
import {
  estimateReachDate,
  PACES,
  proteinRule,
  recommendGoals,
  suggestGoalType,
  type GoalType,
} from '../../data/goals';
import { useDataVersion } from '../../hooks/useDataVersion';
import { formatKg, formatShortDate } from '../../utils/format';
import { SelectDropdown } from '../ui/SelectDropdown';
import { Skeleton } from '../ui/Skeleton';
import { StatTile } from '../ui/StatTile';
import { SummaryCard } from '../ui/SummaryCard';
import {
  getGoalStart,
  getMeasuredExpenditure,
  type Profile,
  type WeightEntry,
} from './api';
import { calculateBMR, calculateTDEE } from './bmr';
import { bodyFatLevel } from './bodyFatLevels';
import { GOAL_TYPE_OPTIONS } from './goalTypes';
import { formatMeasure } from './measures';

interface Props {
  profile: Profile;
  /** Every weigh-in, the latest first; undefined while they are read. */
  history: WeightEntry[] | undefined;
  /** Called once the measured expenditure has been read the first time. */
  onReady?: () => void;
}

const formatPace = (pace: number) => `${pace.toLocaleString('fr-FR')} %/sem.`;

const signedKg = (kg: number) =>
  `${kg > 0 ? '+' : kg < 0 ? '−' : ''}${formatKg(Math.abs(kg))} kg`;

/** What to do about an alert, with the slower pace when there is one. */
function alertAdvice(
  alert: CompositionAlert,
  goalType: GoalType,
  pace: number,
) {
  const slowest = Math.min(...PACES[goalType]);
  if (alert === 'FAT_GAIN') {
    return `Tu prends plus de gras que de masse maigre ces dernières semaines : ${
      pace > slowest
        ? `passe à ${formatPace(slowest)}`
        : 'baisse un peu tes calories'
    }.`;
  }
  return `Ta masse maigre baisse vite ces dernières semaines : ${
    pace > slowest ? `ralentis à ${formatPace(slowest)}, ` : ''
  }atteins bien tes protéines et garde la muscu.`;
}

const formatDay = (date: Date) =>
  date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/**
 * Current goals next to recommended ones. The recommendation (data/goals.ts)
 * starts from the daily expenditure: measured from the journal when there is
 * enough of it, otherwise estimated from the BMR and the activity level. The
 * goal type and the weekly pace set the deficit or surplus. With the body
 * composition, the target body fat sets the target weight, the protein
 * follows the fat-free mass, and the card tells how the fat and the fat-free
 * mass moved since the goal began, with an alert when they go against it.
 */
export function GoalsCard({ profile, history, onReady }: Props) {
  const [paceChoice, setPaceChoice] = useState<string | null>(null);
  // undefined while they are read; null when there is not enough journal,
  // or no goal yet.
  const [measured, setMeasured] = useState<MeasuredExpenditure | null>();
  const [goalStart, setGoalStart] = useState<string | null>();
  const isLoading =
    history === undefined || measured === undefined || goalStart === undefined;
  const version = useDataVersion();
  const latestWeight = history?.[0]?.weight;

  // A new weigh-in can change the measure: read it again with each one.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getMeasuredExpenditure().catch(() => null),
      getGoalStart().catch(() => null),
    ]).then(([expenditure, start]) => {
      if (cancelled) return;
      setMeasured(expenditure);
      setGoalStart(start);
    });
    return () => {
      cancelled = true;
    };
  }, [history, version]);

  const isMeasureRead = measured !== undefined && goalStart !== undefined;
  useEffect(() => {
    if (isMeasureRead) onReady?.();
  }, [isMeasureRead, onReady]);

  const measuredEntry = history ? latestComposition(history) : null;
  const fatFreeMass = measuredEntry ? fatFreeMassOf(measuredEntry) : null;
  const targetWeight = effectiveTargetWeight(profile, fatFreeMass);
  const targetBodyFat = fatFreeMass === null ? null : profile.targetBodyFat;

  const bmr =
    latestWeight && profile.height && profile.birthDate && profile.gender
      ? calculateBMR(
          latestWeight,
          profile.height,
          profile.birthDate,
          profile.gender,
          fatFreeMass,
        )
      : null;
  const estimated =
    bmr && profile.activityLevel
      ? calculateTDEE(bmr, profile.activityLevel)
      : null;
  const expenditure = measured?.kcal ?? estimated;

  const goalType =
    (profile.goalType as GoalType | null) ??
    (latestWeight ? suggestGoalType(latestWeight, targetWeight) : 'MAINTAIN');
  const paces = PACES[goalType];
  const pace =
    paceChoice !== null && paces.includes(Number(paceChoice))
      ? Number(paceChoice)
      : paces[0];

  const recommendation =
    latestWeight && bmr && expenditure
      ? recommendGoals({
          weight: latestWeight,
          fatFreeMass,
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

  const gap = latestWeight && targetWeight ? latestWeight - targetWeight : null;
  const reachDate =
    recommendation && latestWeight && targetWeight
      ? estimateReachDate(
          latestWeight,
          targetWeight,
          recommendation.weeklyChangeKg,
          new Date(),
        )
      : null;
  const level =
    targetBodyFat === null ? null : bodyFatLevel(profile.gender, targetBodyFat);
  const aim =
    targetBodyFat === null
      ? ''
      : ` pour ${targetBodyFat} % de gras (${level ? `${level}, ` : ''}${formatMeasure(targetWeight, 'kg')})`;
  const remaining =
    gap === null
      ? null
      : Math.abs(gap) < 0.05
        ? targetBodyFat === null
          ? 'Poids cible atteint'
          : `Cible atteinte : ${targetBodyFat} % de gras`
        : `${formatMeasure(Math.abs(gap), 'kg')} ${gap > 0 ? 'à perdre' : 'à prendre'}${aim}${reachDate ? `, vers le ${formatDay(reachDate)}` : ''}`;
  const bodyFatHint =
    profile.targetBodyFat !== null && fatFreeMass === null
      ? `Ajoute ta masse grasse à une pesée pour viser ${profile.targetBodyFat} % de gras.`
      : null;

  const since = goalStart ? new Date(goalStart) : null;
  const change = history
    ? compositionChange(history, { from: since ?? undefined })
    : null;
  const changeText = change
    ? `Depuis le ${formatShortDate(new Date(change.since))} : gras ${signedKg(change.fatKg)}, masse maigre ${signedKg(change.leanKg)}`
    : measuredEntry
      ? 'Évolution du gras et de la masse maigre : il faut 3 pesées avec la composition sur 2 semaines.'
      : null;
  const alert = history
    ? compositionAlert(history, {
        goalType,
        goalStart: since,
        warnLeanLoss: profile.leanLossAlert,
      })
    : null;

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

  const protein = proteinRule(goalType, fatFreeMass);
  const proteinText = protein.onLeanMass
    ? `Protéines : ${formatKg(protein.perKg)} g par kg de masse maigre`
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
      {bodyFatHint && <p className="text-xs text-theme-600">{bodyFatHint}</p>}
      {changeText && <p className="text-xs text-theme-600">{changeText}</p>}
      {expenditureText && (
        <p className="text-xs text-theme-600">{expenditureText}</p>
      )}
      {proteinText && <p className="text-xs text-theme-600">{proteinText}</p>}
      {limitNote && <p className="text-xs text-theme-600">{limitNote}</p>}
      {alert && (
        <p className="mt-3 flex gap-2 rounded-lg border border-theme-200 bg-theme-50 px-3 py-2 text-sm text-theme-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-theme-600" />
          {alertAdvice(alert, goalType, pace)}
        </p>
      )}
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
