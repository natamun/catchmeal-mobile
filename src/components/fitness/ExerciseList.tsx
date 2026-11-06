import { useRef, useState, type ReactNode } from 'react';
import { ChevronRight, Search } from 'lucide-react';

import { useBlurOnKeyboardClose } from '../../hooks/useBlurOnKeyboardClose';
import { Input } from '../ui/Input';
import { ListCard, ListCardEmpty, ListCardLoading } from '../ui/ListCard';
import { LoadError } from '../ui/LoadError';
import { matchesSearch } from './search';
import type { Exercise, ExerciseKind } from './types';

const SECTIONS: { label: string; kinds: readonly ExerciseKind[] }[] = [
  { label: 'Musculation', kinds: ['STRENGTH'] },
  { label: 'Cardio', kinds: ['TREADMILL', 'CARDIO'] },
];

interface Props {
  exercises: Exercise[];
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => void;
  headerAction: ReactNode;
  /** Opens the logbook of an exercise. */
  onOpen: (exercise: Exercise) => void;
}

/**
 * The exercise library, searchable, in two sections: strength, then cardio.
 * Each one opens its logbook. Archived exercises are hidden.
 */
export function ExerciseList({
  exercises,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  onOpen,
}: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useBlurOnKeyboardClose(inputRef);

  const active = exercises.filter((exercise) => !exercise.archived);
  const visible = active.filter((exercise) =>
    matchesSearch(exercise.name, query),
  );

  return (
    <ListCard
      header={
        <>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-theme-400" />
            <Input
              ref={inputRef}
              type="text"
              data-hides-nav
              placeholder="Rechercher un exercice..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {headerAction}
        </>
      }
    >
      {isLoading && <ListCardLoading />}
      {loadError && <LoadError message={loadError} onRetry={onRetry} />}
      {!isLoading && !loadError && active.length === 0 && (
        <ListCardEmpty>Aucun exercice enregistré.</ListCardEmpty>
      )}
      {!isLoading &&
        !loadError &&
        active.length > 0 &&
        visible.length === 0 && (
          <ListCardEmpty>
            Aucun exercice ne correspond à cette recherche.
          </ListCardEmpty>
        )}

      {SECTIONS.map(({ label, kinds }) => {
        const rows = visible.filter((exercise) =>
          kinds.includes(exercise.kind),
        );
        if (rows.length === 0) return null;
        return (
          <section key={label}>
            <h3 className="border-b border-theme-200 bg-theme-50 px-5 py-2 text-xs font-semibold tracking-wide text-theme-500 uppercase">
              {label}
            </h3>
            <ul className="divide-y divide-theme-200">
              {rows.map((exercise) => (
                <li key={exercise.id} className="even:bg-theme-50/60">
                  <button
                    type="button"
                    onClick={() => onOpen(exercise)}
                    className="flex w-full cursor-pointer items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-theme-50"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-theme-800">
                      {exercise.name}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-theme-400" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </ListCard>
  );
}
