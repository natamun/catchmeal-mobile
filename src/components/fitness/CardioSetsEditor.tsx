import { Plus, X } from 'lucide-react';

import { Input } from '../ui/Input';
import type { ExerciseKind } from './types';
import { EMPTY_CARDIO_SET, type CardioSetDraft } from './workoutDraft';

/** The button that adds a set, under the sets of any exercise. */
export const ADD_SET_CLASS =
  'flex cursor-pointer items-center gap-1.5 self-start rounded-lg py-1 text-sm font-medium text-theme-600 transition-colors hover:text-theme-800';

const REMOVE_CLASS =
  'tap-area relative flex shrink-0 cursor-pointer justify-center text-theme-400 transition-colors hover:text-red-500';

interface Field {
  key: keyof CardioSetDraft;
  label: string;
  placeholder: string;
}

/** The values of a set: a treadmill's speed and slope, another's resistance. */
const FIELDS: Record<Exclude<ExerciseKind, 'STRENGTH'>, Field[]> = {
  TREADMILL: [
    { key: 'duration', label: 'Durée (min)', placeholder: '30' },
    { key: 'speed', label: 'Vitesse (km/h)', placeholder: '5' },
    { key: 'incline', label: 'Pente (%)', placeholder: '0' },
  ],
  CARDIO: [
    { key: 'duration', label: 'Durée (min)', placeholder: '30' },
    { key: 'resistance', label: 'Résistance', placeholder: '–' },
  ],
};

const COLUMNS = {
  TREADMILL: 'grid-cols-[1.25rem_1fr_1fr_1fr_1.25rem]',
  CARDIO: 'grid-cols-[1.25rem_1fr_1fr_1.25rem]',
};

interface Props {
  kind: Exclude<ExerciseKind, 'STRENGTH'>;
  sets: CardioSetDraft[];
  onChange: (sets: CardioSetDraft[]) => void;
}

/**
 * The sets of a cardio exercise, one numbered row each under the names of
 * the values. A new set starts as a copy of the one before.
 */
export function CardioSetsEditor({ kind, sets, onChange }: Props) {
  const fields = FIELDS[kind];

  const setValue = (index: number, key: keyof CardioSetDraft, value: string) =>
    onChange(
      sets.map((set, i) => (i === index ? { ...set, [key]: value } : set)),
    );

  return (
    <div className="flex flex-col gap-2">
      <div className={`grid ${COLUMNS[kind]} items-end gap-2`}>
        <span />
        {fields.map(({ key, label }) => (
          <span key={key} className="text-center text-xs text-theme-500">
            {label}
          </span>
        ))}
        <span />
      </div>
      {sets.map((set, index) => (
        <div key={index} className={`grid ${COLUMNS[kind]} items-center gap-2`}>
          <span className="text-center text-sm font-semibold text-theme-400 tabular-nums">
            {index + 1}
          </span>
          {fields.map(({ key, label, placeholder }) => (
            <Input
              key={key}
              type="text"
              inputMode="decimal"
              aria-label={`${label}, série ${index + 1}`}
              placeholder={placeholder}
              className="px-2 text-center"
              value={set[key]}
              onChange={(e) => setValue(index, key, e.target.value)}
            />
          ))}
          {sets.length > 1 ? (
            <button
              type="button"
              onClick={() => onChange(sets.filter((_, i) => i !== index))}
              className={REMOVE_CLASS}
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...sets, sets.at(-1) ?? EMPTY_CARDIO_SET])}
        className={ADD_SET_CLASS}
      >
        <Plus className="h-4 w-4" />
        Ajouter une série
      </button>
    </div>
  );
}
