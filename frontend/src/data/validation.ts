import { DataError } from './errors';

/** Decimals allowed on every stored number, as in the forms. */
const MAX_DECIMALS = 2;

interface NumberRule {
  /** Lowest value allowed, or above it when `exclusive` is set. */
  min: number;
  exclusive?: boolean;
  max?: number;
  integer?: boolean;
}

function invalid(label: string): never {
  throw new DataError(`Valeur invalide : ${label}.`);
}

function decimalPlaces(value: number) {
  const [, decimals = ''] = String(value).split('.');
  return /e/i.test(String(value)) ? Infinity : decimals.length;
}

/**
 * A finite number within the rule, with 2 decimals at most (or none for an
 * integer). Throws a DataError naming `label` otherwise.
 */
export function checkNumber(value: unknown, label: string, rule: NumberRule) {
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid(label);
  if (rule.exclusive ? value <= rule.min : value < rule.min) invalid(label);
  if (rule.max !== undefined && value > rule.max) invalid(label);
  if (
    rule.integer
      ? !Number.isInteger(value)
      : decimalPlaces(value) > MAX_DECIMALS
  )
    invalid(label);
  return value;
}

/** Like checkNumber, but null and undefined pass through as null. */
export function checkOptionalNumber(
  value: unknown,
  label: string,
  rule: NumberRule,
) {
  return value === null || value === undefined
    ? null
    : checkNumber(value, label, rule);
}

/** Trimmed text, not empty, `max` characters at most. */
export function checkText(value: unknown, label: string, max: number) {
  if (typeof value !== 'string') invalid(label);
  const text = value.trim();
  if (text === '' || text.length > max) invalid(label);
  return text;
}

/** Trimmed text of `max` characters at most; empty becomes null. */
export function checkOptionalText(value: unknown, label: string, max: number) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') invalid(label);
  const text = value.trim();
  if (text.length > max) invalid(label);
  return text === '' ? null : text;
}

/** One of the allowed values. */
export function checkChoice<T extends string>(
  value: unknown,
  label: string,
  choices: readonly T[],
): T {
  if (!choices.includes(value as T)) invalid(label);
  return value as T;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day written YYYY-MM-DD. */
export function checkDateOnly(value: unknown, label: string) {
  const match = typeof value === 'string' ? DATE_ONLY.exec(value) : null;
  if (!match) invalid(label);
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    invalid(label);
  return value as string;
}
