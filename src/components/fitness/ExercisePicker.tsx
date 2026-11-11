import { useId, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';

import { failureMessage } from '../../utils/failureMessage';
import { DropdownPanel } from '../ui/DropdownPanel';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { SearchInput } from '../ui/SearchInput';
import { useToast } from '../ui/toastContext';
import { createExercise } from './api';
import { CreateExerciseRow } from './CreateExerciseRow';
import { isSameName, matchesSearch } from './search';
import type { Exercise, ExerciseKind } from './types';

const ROW_CLASS =
  'w-full cursor-pointer border-t border-theme-100 px-4 py-2.5 text-left text-sm text-theme-800 transition-colors first:border-t-0 hover:bg-theme-50';

interface Props {
  exercises: Exercise[];
  /** The open dialog, for the list to show above it. */
  dialogNode: HTMLDialogElement | null;
  onPick: (exercise: Exercise) => void;
}

/**
 * A search field to add an exercise: the library's matches, and when the
 * typed name is new, a way to create it on the spot as strength, treadmill or
 * cardio.
 */
export function ExercisePicker({ exercises, dialogNode, onPick }: Props) {
  const id = useId();
  const showToast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const active = exercises.filter((exercise) => !exercise.archived);
  const results = active.filter((exercise) =>
    matchesSearch(exercise.name, search),
  );
  const typed = search.trim();
  const canCreate =
    typed !== '' &&
    !active.some((exercise) => isSameName(exercise.name, typed));
  const isOpen = isFocused && (results.length > 0 || canCreate);

  const pick = (exercise: Exercise) => {
    setSearch('');
    inputRef.current?.blur();
    onPick(exercise);
  };

  const create = async (kind: ExerciseKind) => {
    setIsCreating(true);
    try {
      pick(await createExercise({ name: typed, kind }));
    } catch (error) {
      showToast(failureMessage(error, "Impossible de créer l'exercice."));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={() => {}}>
      <Popover.Anchor className="flex flex-col gap-1.5">
        <label htmlFor={id} className={LABEL_CLASS}>
          Ajouter un exercice
        </label>
        <SearchInput
          ref={inputRef}
          id={id}
          value={search}
          onValueChange={setSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </Popover.Anchor>
      <DropdownPanel container={dialogNode} matchAnchorWidth>
        {canCreate && (
          <CreateExerciseRow
            name={typed}
            onCreate={(kind) => void create(kind)}
            disabled={isCreating}
            keepFocus
            className="border-theme-100 px-4 py-2.5"
          />
        )}
        {results.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(exercise)}
            className={ROW_CLASS}
          >
            {exercise.name}
          </button>
        ))}
      </DropdownPanel>
    </Popover.Root>
  );
}
