import { startOfDay, toDateKey } from './dateKey';

/** A number written the French way, with at most one decimal: 72,5. */
export function formatKg(value: number) {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

/** A date such as "Lundi 20 octobre", capitalized. */
export function formatWeekday(date: Date) {
  const day = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return day.charAt(0).toUpperCase() + day.slice(1);
}

/** A date such as "20 octobre". */
export function formatDayMonth(date: Date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/**
 * How long ago a moment was, by calendar day: "Aujourd'hui", "Hier",
 * "Il y a 3 jours", then the date, "Le 30 oct." (with the year when it is
 * not this year's).
 */
export function formatSince(isoDate: string, today = new Date()) {
  const date = new Date(isoDate);
  const days = Math.round(
    (startOfDay(toDateKey(today)).getTime() -
      startOfDay(toDateKey(date)).getTime()) /
      86_400_000,
  );
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;

  const day = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
  return `Le ${day}`;
}
