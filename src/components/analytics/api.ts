import { throwIfAborted } from '../../data/errors';
import * as stats from '../../data/stats';
import { getDatabase } from '../../db/appDatabase';

/**
 * One entry per day (calories, macros, weigh-in, goal) for the stats page.
 */
export async function getDashboard(
  from: string,
  to: string,
  signal?: AbortSignal,
) {
  const days = await stats.getDashboard(await getDatabase(), from, to);
  throwIfAborted(signal);
  return days;
}
