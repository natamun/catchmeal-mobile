import { parseDecimal } from '../../utils/decimals';
import { formatKg } from '../../utils/format';
import type { CardioSet, WorkoutItem } from './types';
import type { ItemDraft } from './workoutDraft';

/**
 * One set of cardio, short: "10 min à 3,5 km/h, 8 %" on a treadmill,
 * "15 min, résistance 8" or "15 min" on another machine.
 */
export function describeCardioSet(set: CardioSet) {
  const minutes = `${formatKg(set.durationMinutes)} min`;
  if (set.speedKmh !== null) {
    const incline = set.inclinePercent
      ? `, ${formatKg(set.inclinePercent)} %`
      : '';
    return `${minutes} à ${formatKg(set.speedKmh)} km/h${incline}`;
  }
  return set.resistance === null
    ? minutes
    : `${minutes}, résistance ${formatKg(set.resistance)}`;
}

/**
 * What was done on an exercise, short: "12×100 · 10×110 kg" for strength,
 * "10 min à 3,5 km/h, 8 % · 35 min à 4 km/h, 10 %" for cardio.
 */
export function describeValues(
  item: Pick<WorkoutItem, 'kind' | 'sets' | 'cardioSets'>,
) {
  if (item.kind === 'STRENGTH') {
    const sets = item.sets.map(
      (set) => `${set.reps}×${formatKg(set.weightKg)}`,
    );
    return sets.length > 0 ? `${sets.join(' · ')} kg` : '';
  }
  return item.cardioSets.map(describeCardioSet).join(' · ');
}

/**
 * The compact figure of an exercise being typed, its sets and the heaviest
 * load for strength, or its minutes in all for cardio: "3 × 62,5 kg",
 * "2 × 45 min".
 */
export function draftSummary(item: ItemDraft): string {
  if (item.kind === 'STRENGTH') {
    const loads = item.sets
      .map((set) => parseDecimal(set.weight))
      .filter((load): load is number => load !== null);
    return loads.length > 0
      ? `${item.sets.length} × ${formatKg(Math.max(...loads))} kg`
      : `${item.sets.length} ×`;
  }
  const minutes = item.cardioSets.reduce(
    (sum, set) => sum + (parseDecimal(set.duration) ?? 0),
    0,
  );
  return `${item.cardioSets.length} × ${formatKg(minutes)} min`;
}
