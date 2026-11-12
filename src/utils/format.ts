import { startOfDay, toDateKey } from './dateKey';

/** A number written the French way, with at most one decimal: 72,5. */
export function formatKg(value: number) {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

/** A change in kg with its sign: "+0,4", "−1,2", "0". */
export function formatSignedKg(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatKg(Math.abs(value))}`;
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

/** A date such as "30 oct.", with the year when it is not this year's. */
export function formatShortDate(date: Date, today = new Date()) {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
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

  return `Le ${formatShortDate(date, today)}`;
}

/** "1 h 30" or "45 min". */
export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest} min`;
  return rest === 0
    ? `${hours} h`
    : `${hours} h ${String(rest).padStart(2, '0')}`;
}

const COPY = ' (copie)';

/** A name marked as a copy, cut so it stays within `maxLength`. */
export function copyName(name: string, maxLength: number) {
  return `${name.slice(0, maxLength - COPY.length)}${COPY}`;
}
