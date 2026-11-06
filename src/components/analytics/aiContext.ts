import {
  compositionAlert,
  compositionChange,
  effectiveTargetWeight,
  fatFreeMassOf,
  latestComposition,
  type CompositionEntry,
} from '../../data/composition';
import { weightTrend, type MeasuredExpenditure } from '../../data/energy';
import { proteinRule, suggestGoalType, type GoalType } from '../../data/goals';
import { endOfDay, startOfDay, toDateKey } from '../../utils/dateKey';
import { formatKg, formatMinutes } from '../../utils/format';
import {
  strengthExercisesOf,
  strengthProgress,
  summarizeWorkouts,
} from '../fitness/progress';
import type { Workout, WorkoutItem } from '../fitness/types';
import type { Profile } from '../profile/api';
import { getAge } from '../profile/bmr';
import { GOAL_TYPE_OPTIONS } from '../profile/goalTypes';
import { ACTIVITY_OPTIONS, GENDER_OPTIONS } from '../profile/profileOptions';
import type { DashboardDay } from './types';

/** Up to this many days the detail is day by day, then week by week. */
const DAILY_DETAIL_MAX_DAYS = 31;
/** The weight trend needs a few weigh-ins spread over a week at least. */
const MIN_TREND_WEIGH_INS = 3;
const MIN_TREND_SPAN_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const MEASURES = [
  { key: 'weight', label: 'Poids', unit: 'kg' },
  { key: 'bodyFat', label: 'Masse grasse', unit: '%' },
  { key: 'muscleMass', label: 'Masse musculaire', unit: 'kg' },
  { key: 'fatFreeMass', label: 'Masse maigre', unit: 'kg' },
  { key: 'bodyWater', label: 'Eau corporelle', unit: '%' },
] as const;

const NONE = '–';

export interface AiContextInput {
  /** The period, as YYYY-MM-DD, both days included. */
  from: string;
  to: string;
  /** The days of the period that have something, as the dashboard gives them. */
  days: DashboardDay[];
  profile: Profile;
  measured: MeasuredExpenditure | null;
  /**
   * Every weigh-in: the latest gives the weight and the body composition
   * even without one in the period.
   */
  weighIns: readonly CompositionEntry[];
  /** When the current goal began (ISO), or null. */
  goalStart?: string | null;
  /** The training sessions; those of the period are summed up. */
  workouts: readonly Workout[];
  today?: Date;
}

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label;

const signed = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatKg(Math.abs(value))}`;

const longDate = (day: string) =>
  startOfDay(day).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const shortDate = (day: string) =>
  startOfDay(day).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });

/** "sam. 12/10": the weekday shows the weekend habits. */
const weekdayDate = (day: string) =>
  startOfDay(day).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });

/** Every day from `from` to `to`, both included. */
function calendarDays(from: string, to: string) {
  const days: string[] = [];
  const last = startOfDay(to);
  for (
    let date = startOfDay(from);
    date <= last;
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  ) {
    days.push(toDateKey(date));
  }
  return days;
}

const average = (values: number[]) =>
  values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;

const cell = (value: number | null, format = (n: number) => String(n)) =>
  value === null ? NONE : format(Math.round(value * 10) / 10);

/** What the weigh-ins tell of the body and of the goal, for the profile. */
interface BodyNow {
  latestWeighIn: CompositionEntry | undefined;
  measuredEntry: CompositionEntry | null;
  fatFreeMass: number | null;
  goalType: GoalType;
  alert: ReturnType<typeof compositionAlert>;
}

const ALERT_TEXT = {
  FAT_GAIN:
    'le gras monte plus vite que la masse maigre pendant la prise de muscle',
  LEAN_LOSS: 'la masse maigre baisse vite pendant la perte de poids',
} as const;

function profileLines(profile: Profile, body: BodyNow) {
  const { latestWeighIn, measuredEntry, fatFreeMass } = body;
  const person = [
    profile.gender && labelOf(GENDER_OPTIONS, profile.gender),
    profile.birthDate && `${getAge(profile.birthDate)} ans`,
    profile.height && `${profile.height} cm`,
  ].filter(Boolean);
  const activity =
    profile.activityLevel && labelOf(ACTIVITY_OPTIONS, profile.activityLevel);
  const target = effectiveTargetWeight(profile, fatFreeMass);
  const goal = [
    profile.goalType && labelOf(GOAL_TYPE_OPTIONS, profile.goalType),
    profile.targetBodyFat !== null && fatFreeMass !== null && target !== null
      ? `masse grasse cible ${profile.targetBodyFat} %, soit environ ${formatKg(target)} kg en gardant ma masse maigre`
      : profile.targetWeight &&
        `poids cible ${formatKg(profile.targetWeight)} kg`,
  ].filter(Boolean);
  const composition =
    measuredEntry && fatFreeMass !== null
      ? `- Composition à la dernière mesure, le ${longDate(toDateKey(new Date(measuredEntry.loggedAt)))} : ${formatKg(measuredEntry.weight - fatFreeMass)} kg de gras (${formatKg(((measuredEntry.weight - fatFreeMass) / measuredEntry.weight) * 100)} %), ${formatKg(fatFreeMass)} kg de masse maigre`
      : null;

  const lines = [
    person.length > 0 && `- ${person.join(', ')}`,
    latestWeighIn &&
      `- Dernière pesée : ${formatKg(latestWeighIn.weight)} kg, le ${longDate(toDateKey(new Date(latestWeighIn.loggedAt)))}`,
    composition,
    activity && `- Activité : ${activity}`,
    goal.length > 0 && `- Objectif : ${goal.join(', ')}`,
    body.alert &&
      `- Alerte de l'app sur les dernières semaines : ${ALERT_TEXT[body.alert]}`,
  ].filter((line): line is string => Boolean(line));
  return lines.length > 0 ? lines : ['- Non renseigné'];
}

function goalsLines(profile: Profile, body: BodyNow) {
  const goals = [
    profile.dailyCalorieGoal !== null && `${profile.dailyCalorieGoal} kcal`,
    profile.dailyProteinGoal !== null &&
      `${profile.dailyProteinGoal} g de protéines`,
    profile.dailyCarbsGoal !== null &&
      `${profile.dailyCarbsGoal} g de glucides`,
    profile.dailyFatGoal !== null && `${profile.dailyFatGoal} g de lipides`,
  ].filter(Boolean);
  const protein = proteinRule(body.goalType, body.fatFreeMass);
  return [
    goals.length > 0 ? `- ${goals.join(', ')}` : '- Aucun objectif fixé',
    `- L'app recommande ${formatKg(protein.perKg)} g de protéines par kg ${
      protein.onLeanMass ? 'de masse maigre' : 'de poids'
    } pour cet objectif`,
  ];
}

/** How the fat and the fat-free mass moved over the period, on their trend. */
function compositionLine(
  from: string,
  to: string,
  weighIns: readonly CompositionEntry[],
) {
  const change = compositionChange(weighIns, {
    from: startOfDay(from),
    to: endOfDay(to),
  });
  return change
    ? `- Gras et masse maigre sur la période, en tendance sur ${change.weighIns} pesées : gras ${signed(change.fatKg)} kg, masse maigre ${signed(change.leanKg)} kg`
    : null;
}

function expenditureLine(measured: MeasuredExpenditure | null) {
  return measured
    ? `- ${measured.kcal} kcal par jour, mesurée sur les 4 dernières semaines d'après mon journal et mes pesées (${measured.loggedDays} jours loggés, ${measured.weighIns} pesées)`
    : '- Pas encore mesurable : il faut au moins 14 jours de journal et 3 pesées étalées sur 2 semaines, dans les 4 dernières semaines';
}

/** Kg per week over the weigh-ins of the period, or null with too few. */
function weeklyTrend(from: string, days: DashboardDay[]) {
  const start = startOfDay(from).getTime();
  const weighIns = days.flatMap(({ day, weight }) =>
    weight === null
      ? []
      : [
          {
            day: Math.round((startOfDay(day).getTime() - start) / DAY_MS),
            weight,
          },
        ],
  );
  if (weighIns.length < MIN_TREND_WEIGH_INS) return null;
  const span = weighIns.at(-1)!.day - weighIns[0].day;
  return span < MIN_TREND_SPAN_DAYS ? null : weightTrend(weighIns) * 7;
}

function measureLines(from: string, days: DashboardDay[]) {
  const lines: string[] = [];
  for (const { key, label, unit } of MEASURES) {
    const values = days.flatMap((day) => day[key] ?? []);
    if (values.length === 0) continue;
    const first = values[0];
    const last = values.at(-1)!;
    if (values.length === 1) {
      lines.push(`- ${label} : ${formatKg(first)} ${unit} (une seule mesure)`);
      continue;
    }
    const trend = key === 'weight' ? weeklyTrend(from, days) : null;
    lines.push(
      `- ${label} : ${formatKg(first)} → ${formatKg(last)} ${unit} (${signed(last - first)} ${unit})${
        trend === null ? '' : `, tendance ${signed(trend)} kg par semaine`
      }`,
    );
  }
  return lines;
}

const MACRO_HEADERS = 'kcal | Protéines (g) | Glucides (g) | Lipides (g)';

function dailyTable(
  calendar: string[],
  byDay: Map<string, DashboardDay>,
  todayKey: string,
) {
  const rows = calendar.map((day) => {
    const entry = byDay.get(day);
    const label = `${weekdayDate(day)}${day === todayKey ? ' (en cours)' : ''}`;
    return `| ${label} | ${cell(entry?.totalKcal ?? null)} | ${cell(entry?.totalProtein ?? null)} | ${cell(entry?.totalCarbs ?? null)} | ${cell(entry?.totalFat ?? null)} | ${cell(entry?.weight ?? null, formatKg)} |`;
  });
  return [
    `| Jour | ${MACRO_HEADERS} | Poids (kg) |`,
    '|---|---|---|---|---|---|',
    ...rows,
  ];
}

function weeklyTable(
  calendar: string[],
  byDay: Map<string, DashboardDay>,
  todayKey: string,
) {
  const rows: string[] = [];
  for (let index = 0; index < calendar.length; index += 7) {
    const week = calendar.slice(index, index + 7);
    const entries = week.flatMap((day) => byDay.get(day) ?? []);
    const eaten = entries.filter(
      (entry) => entry.totalKcal !== null && entry.day !== todayKey,
    );
    const countable = week.filter((day) => day !== todayKey).length;
    const mean = (
      key: 'totalKcal' | 'totalProtein' | 'totalCarbs' | 'totalFat',
    ) =>
      cell(average(eaten.map((entry) => entry[key]!)), (n) =>
        String(Math.round(n)),
      );
    const weight = average(entries.flatMap((entry) => entry.weight ?? []));
    rows.push(
      `| ${shortDate(week[0])} → ${shortDate(week.at(-1)!)} | ${eaten.length}/${countable} | ${mean('totalKcal')} | ${mean('totalProtein')} | ${mean('totalCarbs')} | ${mean('totalFat')} | ${cell(weight, formatKg)} |`,
    );
  }
  return [
    `| Semaine | Jours loggés | ${MACRO_HEADERS} | Poids moyen (kg) |`,
    '|---|---|---|---|---|---|---|',
    ...rows,
  ];
}

/** A table cell must not hold the column separator. */
const inCell = (text: string) => text.replaceAll('|', '/');

/**
 * "Presse à cuisses : 8×100, 10×90 kg", "Tapis de course : 20 min à 5 km/h,
 * pente 12 %" or "Rameur : 10 min".
 */
function describeItem(item: WorkoutItem) {
  if (item.kind === 'STRENGTH') {
    const sets = item.sets
      .map((set) => `${set.reps}×${formatKg(set.weightKg)}`)
      .join(', ');
    return `${item.exerciseName} : ${sets} kg`;
  }
  const minutes = `${formatKg(item.durationMinutes ?? 0)} min`;
  if (item.kind === 'CARDIO') return `${item.exerciseName} : ${minutes}`;
  return `${item.exerciseName} : ${minutes} à ${formatKg(item.speedKmh ?? 0)} km/h, pente ${formatKg(item.inclinePercent ?? 0)} %`;
}

/**
 * The training of the period: how many days of sessions, the volume lifted
 * and the cardio, then one row per session up to 31 days, or beyond, the
 * sessions per week and how the heaviest load of each exercise moved.
 * Their calories are not given: a measured expenditure already holds the
 * training, the AI is told so.
 */
function sportLines(
  calendar: string[],
  allWorkouts: readonly Workout[],
  measured: MeasuredExpenditure | null,
  isDaily: boolean,
) {
  const [first, last] = [calendar[0], calendar.at(-1)!];
  const workouts = allWorkouts
    .filter(({ performedOn }) => performedOn >= first && performedOn <= last)
    .sort((a, b) => a.performedOn.localeCompare(b.performedOn));
  if (workouts.length === 0) return ['- Aucune séance sur la période'];

  const totals = summarizeWorkouts(workouts);
  const lines = [`- Séances : ${workouts.length}`];
  if (totals.volumeKg > 0) {
    lines.push(
      `- Volume soulevé (répétitions × charge) : ${formatKg(totals.volumeKg / 1000)} t`,
    );
  }
  if (totals.cardioMinutes > 0) {
    lines.push(`- Cardio : ${formatMinutes(totals.cardioMinutes)}`);
  }
  if (totals.distanceKm > 0) {
    lines.push(
      `- Tapis : ${formatKg(totals.distanceKm)} km, ${Math.round(totals.climbMeters)} m de dénivelé positif`,
    );
  }
  if (measured) {
    lines.push(
      '- Ma dépense mesurée plus haut inclut déjà ces séances : ne leur ajoute pas de calories',
    );
  }

  if (isDaily) {
    lines.push(
      '',
      '| Jour | Exercices |',
      '|---|---|',
      ...workouts.map(
        (workout) =>
          `| ${weekdayDate(workout.performedOn)} | ${inCell(workout.items.map(describeItem).join(' ; '))} |`,
      ),
    );
    return lines;
  }

  const progress = strengthExercisesOf(workouts).flatMap(({ id, name }) => {
    const points = strengthProgress(workouts, id);
    return points.length < 2
      ? []
      : [
          `  - ${name} : ${formatKg(points[0].value)} → ${formatKg(points.at(-1)!.value)} kg`,
        ];
  });
  if (progress.length > 0) {
    lines.push(
      '- Charge max, de la première à la dernière séance de la période :',
      ...progress,
    );
  }

  lines.push('', '| Semaine | Séances |', '|---|---|');
  for (let index = 0; index < calendar.length; index += 7) {
    const week = calendar.slice(index, index + 7);
    const inWeek = workouts.filter(
      ({ performedOn }) =>
        performedOn >= week[0] && performedOn <= week.at(-1)!,
    );
    lines.push(
      `| ${shortDate(week[0])} → ${shortDate(week.at(-1)!)} | ${inWeek.length} |`,
    );
  }
  return lines;
}

/**
 * A summary of a period to paste into an AI chat: the profile (age, never the
 * birth date) with the latest weigh-in and body composition, the goal and
 * its alert, the goals set with the protein the app advises, the measured
 * expenditure, the period's averages and measures, its training sessions,
 * then the detail, day by day up to 31 days and week by week
 * beyond. Today's meals are left out of the averages: the day is not over.
 * It ends on "Ma question :" for the question to be typed after it.
 */
export function buildAiContext({
  from,
  to,
  days,
  profile,
  measured,
  weighIns: allWeighIns,
  goalStart = null,
  workouts,
  today = new Date(),
}: AiContextInput) {
  const latestWeighIn = [...allWeighIns].sort((a, b) =>
    b.loggedAt.localeCompare(a.loggedAt),
  )[0];
  const measuredEntry = latestComposition(allWeighIns);
  const fatFreeMass = measuredEntry ? fatFreeMassOf(measuredEntry) : null;
  const goalType =
    (profile.goalType as GoalType | null) ??
    (latestWeighIn
      ? suggestGoalType(
          latestWeighIn.weight,
          effectiveTargetWeight(profile, fatFreeMass),
        )
      : 'MAINTAIN');
  const body: BodyNow = {
    latestWeighIn,
    measuredEntry,
    fatFreeMass,
    goalType,
    alert: compositionAlert(
      allWeighIns,
      {
        goalType,
        goalStart: goalStart ? new Date(goalStart) : null,
        warnLeanLoss: profile.leanLossAlert,
      },
      today,
    ),
  };
  const todayKey = toDateKey(today);
  const calendar = calendarDays(from, to);
  const byDay = new Map(days.map((day) => [day.day, day]));
  const hasToday = calendar.includes(todayKey);
  const eaten = days.filter(
    (day) => day.totalKcal !== null && day.day !== todayKey,
  );
  const countable = calendar.length - (hasToday ? 1 : 0);
  const mean = (
    key: 'totalKcal' | 'totalProtein' | 'totalCarbs' | 'totalFat',
  ) => Math.round(average(eaten.map((day) => day[key]!)) ?? 0);
  const weighIns = days.filter((day) => day.weight !== null).length;

  const period = [
    `- Jours avec repas loggés : ${eaten.length} sur ${countable}${
      hasToday ? " (aujourd'hui n'est pas compté, la journée est en cours)" : ''
    }`,
    eaten.length > 0
      ? `- Moyenne par jour loggé : ${mean('totalKcal')} kcal, ${mean('totalProtein')} g de protéines, ${mean('totalCarbs')} g de glucides, ${mean('totalFat')} g de lipides`
      : '- Aucun repas loggé sur la période',
    `- Pesées : ${weighIns}`,
    ...measureLines(from, days),
  ];
  const composition = compositionLine(from, to, allWeighIns);
  if (composition) period.push(composition);
  if (
    measuredEntry ||
    days.some((day) => MEASURES.slice(1).some(({ key }) => day[key] !== null))
  ) {
    period.push(
      '- La composition corporelle vient de ma balance (impédancemétrie) : approximative, à lire en tendance',
    );
  }

  const isDaily = calendar.length <= DAILY_DETAIL_MAX_DAYS;
  return [
    'Voici mes données de suivi nutritionnel, tirées de mon app. Analyse-les et réponds à ma question à la fin.',
    '',
    '## Profil',
    ...profileLines(profile, body),
    '',
    '## Objectifs que je me suis fixés (par jour)',
    ...goalsLines(profile, body),
    '',
    "## Dépense mesurée par l'app",
    expenditureLine(measured),
    '',
    `## Période du ${longDate(from)} au ${longDate(to)} (${calendar.length} jours)`,
    ...period,
    '',
    '## Sport sur la période',
    ...sportLines(calendar, workouts, measured, isDaily),
    '',
    isDaily
      ? '## Détail par jour'
      : '## Détail par semaine (moyennes des jours loggés)',
    ...(isDaily
      ? dailyTable(calendar, byDay, todayKey)
      : weeklyTable(calendar, byDay, todayKey)),
    '',
    'Ma question : ',
  ].join('\n');
}
