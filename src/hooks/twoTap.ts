/** How long the second tap is awaited before the button calms down. */
export const ARMED_MS = 3000;
/** A second tap sooner than this is the same finger bouncing, not a yes. */
export const MIN_CONFIRM_MS = 400;

/**
 * What a tap on a two-tap button does, given when it was armed (null while
 * calm) and the time of the tap, both in ms: arm it, confirm, or ignore a
 * double tap that came too fast to be a decision.
 */
export function twoTapOutcome(
  armedAt: number | null,
  now: number,
): 'arm' | 'confirm' | 'ignore' {
  if (armedAt === null || now - armedAt >= ARMED_MS) return 'arm';
  if (now - armedAt < MIN_CONFIRM_MS) return 'ignore';
  return 'confirm';
}
