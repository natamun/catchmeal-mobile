import { useState, type RefObject } from 'react';
import { Pencil } from 'lucide-react';

import { middayOf, startOfDay } from '../../utils/dateKey';
import { formatKg, formatMinutes } from '../../utils/format';
import { TimeLineChart } from '../analytics/TimeLineChart';
import { BaseDialog } from '../ui/BaseDialog';
import { SECONDARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { InfoBubble } from '../ui/InfoBubble';
import { describeValues } from './format';
import {
  strengthProgress,
  treadmillClimb,
  treadmillKm,
  type ProgressMetric,
} from './progress';
import { exerciseHistory, strengthRecord } from './records';
import type { Exercise, Workout } from './types';

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

const TILE = 'rounded-xl px-3 py-1.5 text-left';

/** One value of the grid, with the day it was reached under it. */
function Tile({
  label,
  value,
  note,
  isSelected,
  onSelect,
}: {
  label: string;
  value: string;
  note?: string;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const content = (
    <>
      <span className="block text-xs text-theme-600">{label}</span>
      <span className="block font-semibold text-theme-800">{value}</span>
      {note && <span className="block text-xs text-theme-500">{note}</span>}
    </>
  );
  if (!onSelect) return <div className={`${TILE} bg-theme-50`}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${TILE} cursor-pointer transition-colors ${
        isSelected
          ? 'bg-theme-100 ring-2 ring-theme-400'
          : 'bg-theme-50 hover:bg-theme-100'
      }`}
    >
      {content}
    </button>
  );
}

const METRIC_NAMES: Record<ProgressMetric, string> = {
  max: 'Charge max',
  oneRepMax: '1RM estimé',
  volume: 'Volume',
};

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  exercise: Exercise | null;
  workouts: readonly Workout[];
  onEdit: (exercise: Exercise) => void;
}

/**
 * The logbook of one exercise: its records or totals, the curve of the one
 * picked in the grid, its last sessions, and a way to rename or retype it.
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

  const [metric, setMetric] = useState<ProgressMetric>('max');
  const points =
    exercise?.kind === 'STRENGTH'
      ? strengthProgress(workouts, exercise.id, metric).map(
          ({ day, value }) => ({ value, time: middayOf(day) }),
        )
      : [];
  const days = history.map(({ day }) => day).sort();
  const period = days.length
    ? { from: startOfDay(days[0]), to: startOfDay(days.at(-1)!) }
    : null;

  const metricTile = (
    which: ProgressMetric,
    label: string,
    value: number | undefined,
    day: string | undefined,
  ) => (
    <Tile
      label={label}
      value={value === undefined ? '–' : `${formatKg(Math.round(value))} kg`}
      note={day && `le ${shortDay(day)}`}
      isSelected={metric === which}
      onSelect={() => setMetric(which)}
    />
  );

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
              {exercise.kind === 'STRENGTH' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-xs font-semibold tracking-wide text-theme-500 uppercase">
                      Repères
                    </h4>
                    <InfoBubble>
                      <p>
                        <strong>Record</strong> : la charge la plus lourde que
                        tu aies soulevée.
                      </p>
                      <p>
                        <strong>1RM</strong> : la charge que tu pourrais
                        soulever une seule fois, estimée depuis tes séries.
                      </p>
                      <p>
                        <strong>Volume</strong> : répétitions × charge,
                        additionnées sur une séance. Ici ta meilleure séance.
                      </p>
                      <p className="text-theme-500">
                        Touche une case pour voir sa courbe.
                      </p>
                    </InfoBubble>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Tile label="Séances" value={String(history.length)} />
                    {metricTile('max', 'Record', record?.weightKg, record?.day)}
                    {metricTile(
                      'oneRepMax',
                      '1RM estimé',
                      record?.oneRepMax,
                      record?.oneRepMaxDay,
                    )}
                    {metricTile(
                      'volume',
                      'Volume',
                      record?.volumeKg,
                      record?.volumeDay,
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Tile label="Séances" value={String(history.length)} />
                  <Tile
                    label="Temps total"
                    value={minutes > 0 ? formatMinutes(minutes) : '–'}
                  />
                  {exercise.kind === 'TREADMILL' && (
                    <>
                      <Tile
                        label="Distance"
                        value={`${formatKg(distance)} km`}
                      />
                      <Tile label="Dénivelé" value={`${Math.round(climb)} m`} />
                    </>
                  )}
                </div>
              )}

              {points.length > 1 && period && (
                <TimeLineChart
                  points={points}
                  name={METRIC_NAMES[metric]}
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
                        {describeValues(item)}
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
