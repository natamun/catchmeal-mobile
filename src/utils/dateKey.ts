/** Formats a date as YYYY-MM-DD in local time, the way days are stored. */
export function toDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight at the start of a YYYY-MM-DD day. */
export function startOfDay(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Local midnight at the end of a YYYY-MM-DD day (the start of the next one). */
export function endOfDay(dateKey: string) {
  const start = startOfDay(dateKey);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
}
