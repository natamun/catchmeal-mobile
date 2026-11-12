import { useRef, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { useBlurOnKeyboardClose } from '../../hooks/useBlurOnKeyboardClose';
import { Card, CardEmpty, CardLoading } from '../ui/Card';
import { LoadError } from '../ui/LoadError';
import { isSameName, matchesSearch } from '../ui/search';
import { SearchInput } from '../ui/SearchInput';
import { CreateExerciseRow } from './CreateExerciseRow';
import { describeValues } from './format';
import type { Exercise, ExerciseKind, WorkoutItem } from './types';

const SECTIONS: { label: string; kinds: readonly ExerciseKind[] }[] = [
  { label: 'Musculation', kinds: ['STRENGTH'] },
  { label: 'Cardio', kinds: ['TREADMILL', 'CARDIO'] },
];

interface Props {
  exercises: Exercise[];
  isLoading: boolean;
  loadError: string | null;
  onRetry?: () => void;
  headerAction?: ReactNode;
  /** The last time each exercise was done, shown under its name. */
  latest: Map<number, WorkoutItem>;
  /** Opens the logbook of an exercise, from the library. */
  onOpen?: (exercise: Exercise) => void;
  /** A button at the end of each row, such as the picker's selection. */
  renderAction?: (exercise: Exercise) => ReactNode;
  /** Creates the typed exercise when the library has none of that name. */
  onCreate?: (name: string, kind: ExerciseKind) => void;
}

/**
 * The exercise library, searchable, in two sections: strength, then cardio.
 * Each row recalls the last time the exercise was done. Archived exercises
 * are hidden.
 */
export function ExerciseList({
  exercises,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  latest,
  onOpen,
  renderAction,
  onCreate,
}: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useBlurOnKeyboardClose(inputRef);

  const active = exercises.filter((exercise) => !exercise.archived);
  const visible = active.filter((exercise) =>
    matchesSearch(exercise.name, query),
  );
  const typed = query.trim();
  const canCreate =
    onCreate !== undefined &&
    typed !== '' &&
    !active.some((exercise) => isSameName(exercise.name, typed));

  const content = (exercise: Exercise) => {
    const last = latest.get(exercise.id);
    return (
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold text-theme-800">
          {exercise.name}
        </span>
        <span className="truncate text-xs text-theme-500">
          {last ? describeValues(last) : 'Jamais fait'}
        </span>
      </span>
    );
  };

  return (
    <Card
      flush
      header={
        <>
          <SearchInput
            ref={inputRef}
            data-hides-nav
            value={query}
            onValueChange={setQuery}
          />
          {headerAction}
        </>
      }
    >
      {isLoading && <CardLoading />}
      {loadError && <LoadError message={loadError} onRetry={onRetry} />}

      {canCreate && (
        <CreateExerciseRow
          name={typed}
          onCreate={(kind) => {
            onCreate(typed, kind);
            setQuery('');
          }}
          className="border-theme-200 px-5 py-3"
        />
      )}

      {!isLoading && !loadError && active.length === 0 && !canCreate && (
        <CardEmpty>Aucun exercice enregistré.</CardEmpty>
      )}
      {!isLoading &&
        !loadError &&
        active.length > 0 &&
        visible.length === 0 &&
        !canCreate && (
          <CardEmpty>Aucun exercice ne correspond à cette recherche.</CardEmpty>
        )}

      {SECTIONS.map(({ label, kinds }) => {
        const rows = visible.filter((exercise) =>
          kinds.includes(exercise.kind),
        );
        if (rows.length === 0) return null;
        return (
          <section key={label}>
            <h3 className="border-b border-theme-200 bg-theme-50 px-5 py-2 text-xs font-semibold text-theme-500">
              {label}
            </h3>
            <ul className="divide-y divide-theme-200">
              {rows.map((exercise) => (
                <li key={exercise.id} className="even:bg-theme-50/60">
                  {onOpen ? (
                    <button
                      type="button"
                      onClick={() => onOpen(exercise)}
                      className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-theme-50"
                    >
                      {content(exercise)}
                      <ChevronRight className="h-4 w-4 shrink-0 text-theme-400" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-5 py-3">
                      {content(exercise)}
                      {renderAction?.(exercise)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </Card>
  );
}
