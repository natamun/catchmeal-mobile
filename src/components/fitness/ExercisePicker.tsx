import { useState } from 'react';

import { failureMessage } from '../../utils/failureMessage';
import { isSameName, matchesSearch } from '../ui/search';
import { SearchPicker } from '../ui/SearchPicker';
import { useToast } from '../ui/toastContext';
import { createExercise } from './api';
import { CreateExerciseRow } from './CreateExerciseRow';
import type { Exercise, ExerciseKind } from './types';

interface Props {
  exercises: Exercise[];
  /** Already in the list being edited. */
  isAdded: (exercise: Exercise) => boolean;
  onPick: (exercise: Exercise) => void;
}

/**
 * A field that opens the search of an exercise: the library's matches, and
 * when the typed name is new, a way to create it on the spot as strength,
 * treadmill or cardio.
 */
export function ExercisePicker({ exercises, isAdded, onPick }: Props) {
  const showToast = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const active = exercises.filter((exercise) => !exercise.archived);

  const create = async (name: string, kind: ExerciseKind) => {
    setIsCreating(true);
    try {
      onPick(await createExercise({ name, kind }));
    } catch (error) {
      showToast(failureMessage(error, "Impossible de créer l'exercice."));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SearchPicker
      label="Ajouter un exercice"
      placeholder="Rechercher un exercice"
      items={active}
      keyOf={(exercise) => exercise.id}
      nameOf={(exercise) => exercise.name}
      matches={(exercise, query) => matchesSearch(exercise.name, query)}
      isAdded={isAdded}
      onPick={onPick}
      renderExtra={(typed) =>
        !active.some((exercise) => isSameName(exercise.name, typed)) && (
          <CreateExerciseRow
            name={typed}
            onCreate={(kind) => void create(typed, kind)}
            disabled={isCreating}
            className="-mx-4 border-theme-100 px-4 py-3"
          />
        )
      }
    />
  );
}
