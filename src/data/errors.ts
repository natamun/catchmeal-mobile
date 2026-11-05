/**
 * A change refused by a rule of the app. Its message is written for the user
 * and can be shown as is.
 */
export class DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataError';
  }
}

/**
 * Stops a read whose screen has gone away, the way an aborted fetch does: the
 * caller sees an AbortError and its `signal.aborted` check ignores it.
 */
export function throwIfAborted(signal?: AbortSignal) {
  signal?.throwIfAborted();
}
