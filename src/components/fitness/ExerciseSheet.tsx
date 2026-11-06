import type { RefObject } from 'react';
import { Pencil } from 'lucide-react';

import { middayOf, startOfDay } from '../../utils/dateKey';
import { formatKg, formatMinutes } from '../../utils/format';
import { TimeLineChart } from '../analytics/TimeLineChart';
import { BaseDialog } from '../ui/BaseDialog';
import { SECONDARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { StatTile } from '../ui/StatTile';
import { strengthProgress, treadmillClimb, treadmillKm } from './progress';
import { exerciseHistory, strengthRecord } from './records';
import type { Exercise, Workout, WorkoutItem } from './types';

/** How many past sessions the sheet lists. */
const RECENT = 5;

/** "5 nov.", or "5 nov. 2025" for another year. */
function shortDay(day: string) {
  const date = startOfDay(day);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

/** "12×100 · 10×110 kg" or "45 min · 4 km/h · 10 %". */
function describe(item: WorkoutItem) {
  if (item.kind === 'STRENGTH') {
    return `${item.sets.map((set) => `${set.reps}×${formatKg(set.weightKg)}`).join(' · ')} kg`;
  }
  return [
    item.durationMinutes !== null && `${formatKg(item.durationMinutes)} min`,
    item.speedKmh !== null && `${formatKg(item.speedKmh)} km/h`,
    item.inclinePercent !== null && `${formatKg(item.inclinePercent)} %`,
  ]
    .filter(Boolean)
    .join(' · ');
}

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  exercise: Exercise | null;
  workouts: readonly Workout[];
  onEdit: (exercise: Exercise) => void;
}

/**
 * The logbook of one exercise: its records or totals, its progress and its
 * last sessions, with a way to rename or retype it.
 */
export function ExerciseSheet({
  dialogRef,
  exercise,
  workouts,
  onEdit,
}: Props) {
  const history = exercise ? exerciseHistory(workouts, exercise.id) : [];
  const record =
    exercise?.kind === 'STRENGTH'
      ? strengthRecord(workouts, exercise.id)
      : null;
  const items = history.map(({ item }) => item);
  const minutes = items.reduce((sum, i) => sum + (i.durationMinutes ?? 0), 0);
  const distance = items.reduce((sum, i) => sum + treadmillKm(i), 0);
  const climb = items.reduce((sum, i) => sum + treadmillClimb(i), 0);

  const tiles = !exercise
    ? []
    : exercise.kind === 'STRENGTH'
      ? [
          {
            label: 'Record',
            value: record ? `${formatKg(record.weightKg)} kg` : '–',
            note: record && `le ${shortDay(record.day)}`,
          },
          {
            label: '1RM estimé',
            value: record
              ? `${formatKg(Math.round(record.oneRepMax))} kg`
              : '–',
            note: record && `le ${shortDay(record.oneRepMaxDay)}`,
          },
        ]
      : [
          {
            label: 'Temps total',
            value: minutes > 0 ? formatMinutes(minutes) : '–',
          },
          ...(exercise.kind === 'TREADMILL'
            ? [
                { label: 'Distance', value: `${formatKg(distance)} km` },
                { label: 'Dénivelé', value: `${Math.round(climb)} m` },
              ]
            : []),
        ];

  const points =
    exercise?.kind === 'STRENGTH'
      ? strengthProgress(workouts, exercise.id).map(({ day, value }) => ({
          value,
          time: middayOf(day),
        }))
      : [];
  const days = history.map(({ day }) => day).sort();
  const period = days.length
    ? { from: startOfDay(days[0]), to: startOfDay(days.at(-1)!) }
    : null;

  return (
    <BaseDialog dialogRef={dialogRef} title={exercise?.name ?? ''}>
      {exercise && (
        <div className="flex flex-col gap-5">
          {history.length === 0 ? (
            <p className="text-sm text-theme-600">
              Pas encore de séance avec cet exercice.
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3">
                <StatTile label="Séances">{history.length}</StatTile>
                {tiles.map(({ label, value, ...rest }) => (
                  <StatTile key={label} label={label}>
                    {value}
                    {'note' in rest && rest.note && (
                      <span className="ml-1.5 text-xs font-normal text-theme-500">
                        {rest.note}
                      </span>
                    )}
                  </StatTile>
                ))}
              </dl>

              {points.length > 1 && period && (
                <TimeLineChart
                  points={points}
                  name="Charge max"
                  unit="kg"
                  period={period}
                />
              )}

              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-semibold tracking-wide text-theme-500 uppercase">
                  Dernières séances
                </h4>
                <ul className="divide-y divide-theme-100">
                  {history.slice(0, RECENT).map(({ day, workoutId, item }) => (
                    <li
                      key={`${workoutId}-${item.id}`}
                      className="flex items-baseline justify-between gap-3 py-2 text-sm"
                    >
                      <span className="shrink-0 text-theme-600">
                        {shortDay(day)}
                      </span>
                      <span className="min-w-0 truncate text-right font-medium text-theme-800 tabular-nums">
                        {describe(item)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => onEdit(exercise)}
            className={SECONDARY_BUTTON_CLASS}
          >
            <Pencil className="h-4 w-4" />
            Modifier l&apos;exercice
          </button>
        </div>
      )}
    </BaseDialog>
  );
}
