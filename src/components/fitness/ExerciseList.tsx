import { useRef, useState, type ReactNode } from 'react';

import { useBlurOnKeyboardClose } from '../../hooks/useBlurOnKeyboardClose';
import { Card } from '../ui/Card';
import { ListRow, ListRows } from '../ui/ListRow';
import { ListStatus } from '../ui/ListStatus';
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
      <ListStatus
        isLoading={isLoading}
        loadError={loadError}
        onRetry={onRetry}
        total={active.length}
        shown={visible.length}
        empty="Aucun exercice enregistré."
        none="Aucun exercice"
        query={query}
        onClear={() => setQuery('')}
        quiet={canCreate}
      />
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
            <ListRows>
              {rows.map((exercise) => {
                const last = latest.get(exercise.id);
                return (
                  <ListRow
                    key={exercise.id}
                    title={exercise.name}
                    subtitle={last ? describeValues(last) : 'Jamais fait'}
                    onClick={onOpen && (() => onOpen(exercise))}
                    action={renderAction?.(exercise)}
                  />
                );
              })}
            </ListRows>
          </section>
        );
      })}
    </Card>
  );
}
