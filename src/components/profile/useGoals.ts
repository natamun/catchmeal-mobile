import { useEffect, useState } from 'react';

import {
  compositionAlert,
  compositionChange,
  effectiveTargetWeight,
  fatFreeMassOf,
  latestComposition,
  type CompositionAlert,
} from '../../data/composition';
import {
  measureHoldsGoalStart,
  type MeasuredExpenditure,
} from '../../data/energy';
import {
  estimateReachDate,
  goalPaceOf,
  PACES,
  proteinRule,
  recommendGoals,
  suggestGoalType,
  type GoalType,
} from '../../data/goals';
import { useDataVersion } from '../../hooks/useDataVersion';
import { formatKg, formatShortDate } from '../../utils/format';
import { useToast } from '../ui/toastContext';
import {
  getGoalStart,
  getMeasuredExpenditure,
  updateProfile,
  type Profile,
  type WeightEntry,
} from './api';
import { calculateBMR, calculateTDEE } from './bmr';
import { bodyFatLevel } from './bodyFatLevels';
import { formatMeasure } from './measures';
import { useProfile } from './profileContext';

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
    return `Plus de gras que de masse maigre pris ces dernières semaines : ${
      pace > slowest
        ? `passer à ${formatPace(slowest)}`
        : 'baisser un peu les calories'
    }.`;
  }
  return `La masse maigre baisse vite ces dernières semaines : ${
    pace > slowest ? `ralentir à ${formatPace(slowest)}, ` : ''
  }atteindre les protéines et garder la musculation.`;
}

/**
 * Everything the goals show, computed from the profile and the weigh-ins.
 * The recommendation (data/goals.ts) starts from the daily expenditure:
 * measured from the journal when there is enough of it, otherwise estimated
 * from the BMR and the activity level. The goal type and the weekly pace set
 * the deficit or surplus. With the body composition, the target body fat sets
 * the target weight, the protein follows the fat-free mass, and the change
 * of fat and fat-free mass since the goal began is read, with an alert when
 * they go against it.
 */
export function useGoals(
  profile: Profile,
  history: WeightEntry[] | null | undefined,
) {
  const { updateProfile: keepProfile } = useProfile();
  const showToast = useToast();
  // undefined while they are read; null when there is not enough journal,
  // or no goal yet.
  const [measured, setMeasured] = useState<MeasuredExpenditure | null>();
  const [goalStart, setGoalStart] = useState<string | null>();
  const isMeasureRead = measured !== undefined && goalStart !== undefined;
  const isLoading = !history || !isMeasureRead;
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
  const pace = goalPaceOf(goalType, profile.goalPace);

  // Shown at once, then saved: the profile goes back if the save fails.
  const savePace = async (value: string) => {
    const before = profile.goalPace;
    keepProfile({ goalPace: Number(value) });
    try {
      await updateProfile({ goalPace: Number(value) });
    } catch {
      keepProfile({ goalPace: before });
      showToast("Impossible d'enregistrer le rythme");
    }
  };

  // Shown at once, then saved, like the pace.
  const saveGoalType = async (value: string) => {
    const before = profile.goalType;
    keepProfile({ goalType: value });
    try {
      await updateProfile({ goalType: value });
    } catch {
      keepProfile({ goalType: before });
      showToast("Impossible d'enregistrer l'objectif");
    }
  };

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
      key: 'kcal',
      label: 'Calories',
      unit: 'kcal',
      goal: profile.dailyCalorieGoal,
      recommended: recommendation?.kcal ?? null,
    },
    {
      key: 'protein',
      label: 'Protéines',
      unit: 'g',
      goal: profile.dailyProteinGoal,
      recommended: recommendation?.protein ?? null,
    },
    {
      key: 'carbs',
      label: 'Glucides',
      unit: 'g',
      goal: profile.dailyCarbsGoal,
      recommended: recommendation?.carbs ?? null,
    },
    {
      key: 'fat',
      label: 'Lipides',
      unit: 'g',
      goal: profile.dailyFatGoal,
      recommended: recommendation?.fat ?? null,
    },
  ] as const;

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
  /** What the target is, such as "pour 15 % de gras (athlétique)". */
  const aimText =
    targetBodyFat === null
      ? null
      : `pour ${targetBodyFat} % de gras${level ? ` (${level})` : ''}`;
  const isReached = gap !== null && Math.abs(gap) < 0.05;
  /** "4,4 kg à perdre", or the target reached. */
  const remainingHead =
    gap === null
      ? null
      : isReached
        ? targetBodyFat === null
          ? 'Poids cible atteint'
          : `Cible atteinte : ${targetBodyFat} % de gras`
        : `${formatMeasure(Math.abs(gap), 'kg')} ${gap > 0 ? 'à perdre' : 'à prendre'}`;
  const bodyFatHint =
    profile.targetBodyFat !== null && fatFreeMass === null
      ? `Ajouter la masse grasse à une pesée pour viser ${profile.targetBodyFat} % de gras.`
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
  const alertText = alert ? alertAdvice(alert, goalType, pace) : null;

  const expenditureText = measured
    ? `Dépense mesurée sur ${measured.loggedDays} jours : ${formatMeasure(measured.kcal, 'kcal')}`
    : expenditure
      ? `Dépense estimée : ${formatMeasure(expenditure, 'kcal')}, mesurée après 2 semaines de journal`
      : null;

  const goalBegan =
    since ?? (history?.length ? new Date(history.at(-1)!.loggedAt) : null);
  const waterNote =
    measured &&
    goalBegan &&
    goalType !== 'MAINTAIN' &&
    measureHoldsGoalStart(goalBegan)
      ? `Début d'objectif : l'eau et le glycogène ${
          goalType === 'GAIN_MUSCLE' ? 'repris' : 'perdus'
        } les 2 premières semaines font paraître la dépense plus ${
          goalType === 'GAIN_MUSCLE' ? 'basse' : 'haute'
        } qu'elle n'est.`
      : null;

  const protein = proteinRule(goalType, fatFreeMass);
  const proteinText = protein.onLeanMass
    ? `Protéines : ${formatKg(protein.perKg)} g par kg de masse maigre`
    : null;

  const limitNote = recommendation?.limitedByBmr
    ? 'Rythme limité : les calories ne descendent pas sous le métabolisme de base.'
    : null;

  return {
    isLoading,
    isMeasureRead,
    recommendation,
    rows,
    paces,
    pace,
    savePace,
    targetWeight,
    goalBegan,
    remainingHead,
    aimText: isReached ? null : aimText,
    reachDate: isReached ? null : reachDate,
    goalType,
    saveGoalType,
    bodyFatHint,
    change,
    changeText,
    alertText,
    expenditureText,
    waterNote,
    proteinText,
    limitNote,
  };
}

export type Goals = ReturnType<typeof useGoals>;
