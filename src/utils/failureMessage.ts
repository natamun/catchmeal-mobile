import { DataError } from '../data/errors';

/**
 * The message to show for a failed action: the one of a rule of the app
 * (DataError, already written for the user), else `fallback`.
 */
export function failureMessage(error: unknown, fallback: string) {
  return error instanceof DataError ? error.message : fallback;
}
