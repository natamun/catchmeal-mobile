import { formatKg } from '../../utils/format';
import type { WorkoutItem } from './types';

/**
 * What was done on an exercise, short: "12×100 · 10×110 kg" for strength,
 * "45 min · 4 km/h · 10 %" for a treadmill, "15 min" for other cardio.
 */
export function describeValues(
  item: Pick<
    WorkoutItem,
    'kind' | 'sets' | 'durationMinutes' | 'speedKmh' | 'inclinePercent'
  >,
) {
  if (item.kind === 'STRENGTH') {
    const sets = item.sets.map(
      (set) => `${set.reps}×${formatKg(set.weightKg)}`,
    );
    return sets.length > 0 ? `${sets.join(' · ')} kg` : '';
  }
  return [
    item.durationMinutes !== null && `${formatKg(item.durationMinutes)} min`,
    item.speedKmh !== null && `${formatKg(item.speedKmh)} km/h`,
    item.inclinePercent !== null && `${formatKg(item.inclinePercent)} %`,
  ]
    .filter(Boolean)
    .join(' · ');
}
