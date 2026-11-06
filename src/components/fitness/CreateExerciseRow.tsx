import type { MouseEvent } from 'react';
import { Plus } from 'lucide-react';

import type { ExerciseKind } from './types';

const NEW_KINDS: { kind: ExerciseKind; label: string }[] = [
  { kind: 'STRENGTH', label: 'Muscu' },
  { kind: 'TREADMILL', label: 'Tapis' },
  { kind: 'CARDIO', label: 'Cardio' },
];

interface Props {
  name: string;
  onCreate: (kind: ExerciseKind) => void;
  disabled?: boolean;
  /** Leaves the focus in the search field, for a dropdown that needs it. */
  keepFocus?: boolean;
  /** The padding and border of the row, to match its list. */
  className: string;
}

/** Offers to create the exercise searched for, with a button per kind. */
export function CreateExerciseRow({
  name,
  onCreate,
  disabled,
  keepFocus,
  className,
}: Props) {
  const holdFocus = (event: MouseEvent) => {
    if (keepFocus) event.preventDefault();
  };

  return (
    <div className={`flex flex-col gap-2 border-b bg-theme-50 ${className}`}>
      <span className="truncate text-sm text-theme-700">Créer « {name} »</span>
      <div className="flex gap-2">
        {NEW_KINDS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            disabled={disabled}
            onMouseDown={holdFocus}
            onClick={() => onCreate(kind)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-theme-200 bg-surface py-2 text-sm font-medium text-theme-700 transition-colors hover:bg-theme-100 disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
