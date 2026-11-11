import { formatKg, formatSignedKg } from '../../utils/format';
import type { PeriodSummary } from './periodSummary';

const NBSP = ' ';

/** "−0,4 kg/sem." */
export const perWeekLabel = (kg: number) =>
  `${formatSignedKg(kg)}${NBSP}kg/sem.`;

/** "80,6 → 80,1 kg", kept on one line. */
export const weightSpan = ({
  first,
  last,
}: NonNullable<PeriodSummary['weight']>) =>
  `${formatKg(first)}${NBSP}→${NBSP}${formatKg(last)}${NBSP}kg`;

/** "2,5 par semaine", or "3 séances" over a period under a week. */
export function sessionsPhrase({ count, perWeek }: PeriodSummary['sessions']) {
  if (count === 0) return 'Aucune';
  if (perWeek === null) {
    return `${count}${NBSP}${count > 1 ? 'séances' : 'séance'}`;
  }
  return `${formatKg(Math.round(perWeek * 10) / 10)} par semaine`;
}
