import { weightTrend, type MeasuredExpenditure } from '../../data/energy';
import { startOfDay, toDateKey } from '../../utils/dateKey';
import { formatKg } from '../../utils/format';
import type { Profile } from '../profile/api';
import { getAge } from '../profile/bmr';
import { GOAL_TYPE_OPTIONS } from '../profile/goalTypes';
import { ACTIVITY_OPTIONS, GENDER_OPTIONS } from '../profile/profileOptions';
import type { DashboardDay } from './types';

/** Up to this many days the detail is day by day, then week by week. */
export const DAILY_DETAIL_MAX_DAYS = 31;
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
  /** The latest weigh-in of all, so the weight is known even without one in the period. */
  latestWeighIn: { weight: number; loggedAt: string } | null;
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

function profileLines(
  profile: Profile,
  latestWeighIn: AiContextInput['latestWeighIn'],
) {
  const person = [
    profile.gender && labelOf(GENDER_OPTIONS, profile.gender),
    profile.birthDate && `${getAge(profile.birthDate)} ans`,
    profile.height && `${profile.height} cm`,
  ].filter(Boolean);
  const activity =
    profile.activityLevel && labelOf(ACTIVITY_OPTIONS, profile.activityLevel);
  const goal = [
    profile.goalType && labelOf(GOAL_TYPE_OPTIONS, profile.goalType),
    profile.targetWeight && `poids cible ${formatKg(profile.targetWeight)} kg`,
  ].filter(Boolean);

  const lines = [
    person.length > 0 && `- ${person.join(', ')}`,
    latestWeighIn &&
      `- Dernière pesée : ${formatKg(latestWeighIn.weight)} kg, le ${longDate(toDateKey(new Date(latestWeighIn.loggedAt)))}`,
    activity && `- Activité : ${activity}`,
    goal.length > 0 && `- Objectif : ${goal.join(', ')}`,
  ].filter((line): line is string => Boolean(line));
  return lines.length > 0 ? lines : ['- Non renseigné'];
}

function goalsLine(profile: Profile) {
  const goals = [
    profile.dailyCalorieGoal !== null && `${profile.dailyCalorieGoal} kcal`,
    profile.dailyProteinGoal !== null &&
      `${profile.dailyProteinGoal} g de protéines`,
    profile.dailyCarbsGoal !== null &&
      `${profile.dailyCarbsGoal} g de glucides`,
    profile.dailyFatGoal !== null && `${profile.dailyFatGoal} g de lipides`,
  ].filter(Boolean);
  return goals.length > 0 ? `- ${goals.join(', ')}` : '- Aucun objectif fixé';
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

/**
 * A summary of a period to paste into an AI chat: the profile (age, never the
 * birth date) with the latest weigh-in, the goals set, the measured expenditure, the period's averages
 * and measures, then the detail, day by day up to 31 days and week by week
 * beyond. Today's meals are left out of the averages: the day is not over.
 * It ends on "Ma question :" for the question to be typed after it.
 */
export function buildAiContext({
  from,
  to,
  days,
  profile,
  measured,
  latestWeighIn,
  today = new Date(),
}: AiContextInput) {
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
  if (
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
    ...profileLines(profile, latestWeighIn),
    '',
    '## Objectifs que je me suis fixés (par jour)',
    goalsLine(profile),
    '',
    "## Dépense mesurée par l'app",
    expenditureLine(measured),
    '',
    `## Période du ${longDate(from)} au ${longDate(to)} (${calendar.length} jours)`,
    ...period,
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
