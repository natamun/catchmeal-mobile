import { useId } from 'react';

import { Input } from '../ui/Input';
import type { ExerciseKind } from './types';

/** One number field of a cardio exercise, with its label above it. */
function CardioField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs text-theme-500">
        {label}
      </label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        className="text-center"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export interface CardioValues {
  duration: string;
  speed: string;
  incline: string;
}

interface Props {
  kind: Exclude<ExerciseKind, 'STRENGTH'>;
  values: CardioValues;
  onChange: (values: Partial<CardioValues>) => void;
  /** Placeholders, for a favorite whose values may stay empty. */
  placeholders?: CardioValues;
}

const EXAMPLES: CardioValues = { duration: '30', speed: '5', incline: '0' };

/** The duration of a cardio exercise, with the speed and slope of a treadmill. */
export function CardioFields({
  kind,
  values,
  onChange,
  placeholders = EXAMPLES,
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <CardioField
        label="Durée (min)"
        placeholder={placeholders.duration}
        value={values.duration}
        onChange={(duration) => onChange({ duration })}
      />
      {kind === 'TREADMILL' && (
        <>
          <CardioField
            label="Vitesse (km/h)"
            placeholder={placeholders.speed}
            value={values.speed}
            onChange={(speed) => onChange({ speed })}
          />
          <CardioField
            label="Pente (%)"
            placeholder={placeholders.incline}
            value={values.incline}
            onChange={(incline) => onChange({ incline })}
          />
        </>
      )}
    </div>
  );
}
