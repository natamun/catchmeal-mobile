import { useEffect, useMemo, useState } from 'react';

import { useDataVersion } from '../../hooks/useDataVersion';
import { useToggleSet } from '../../hooks/useToggleSet';
import { startOfDay } from '../../utils/dateKey';
import { failureMessage } from '../../utils/failureMessage';
import { formatWeekday } from '../../utils/format';
import {
  createExercise,
  getLastPerformance,
  listExercises,
  listTemplates,
  listWorkouts,
} from '../fitness/api';
import { ExerciseList } from '../fitness/ExerciseList';
import { latestItems } from '../fitness/records';
import { TemplateList } from '../fitness/TemplateList';
import { TrainingDayReview } from '../fitness/TrainingDayReview';
import type {
  Exercise,
  ExerciseKind,
  Workout,
  WorkoutTemplate,
} from '../fitness/types';
import { draftFor, type ItemDraft } from '../fitness/workoutDraft';
import { FlowHeader } from '../layout/FlowHeader';
import { PillTabs } from '../ui/PillTabs';
import { SelectToggle } from '../ui/SelectToggle';
import { useToast } from '../ui/toastContext';
import { SelectionBar } from './SelectionBar';

type PickerTab = 'exercises' | 'favorites';

const TAB_OPTIONS: { value: PickerTab; label: string }[] = [
  { value: 'exercises', label: 'Exercices' },
  { value: 'favorites', label: 'Séances' },
];

interface Library {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  workouts: Workout[];
}

/** An exercise picked, alone or through a favorite. */
interface Picked {
  exercise: Pick<Exercise, 'id' | 'name' | 'kind'>;
}

interface Props {
  /** The day of the session (YYYY-MM-DD). */
  day: string;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * Page content that adds exercises to the day's session, like the journal's
 * food picker, in two steps: select exercises and favorites in two tabs, then
 * check the values, started from the last time, before adding them. An
 * exercise already in the day's session is left out.
 */
export function TrainingPicker({ day, onClose, onAdded }: Props) {
  const version = useDataVersion();
  const showToast = useToast();
  const [library, setLibrary] = useState<Library | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<PickerTab>('exercises');
  const [selectedExerciseIds, toggleExercise] = useToggleSet<number>();
  const [selectedTemplateIds, toggleTemplate] = useToggleSet<number>();
  const [review, setReview] = useState<{
    key: number;
    items: ItemDraft[];
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listExercises(controller.signal),
      listTemplates(controller.signal),
      listWorkouts(controller.signal),
    ])
      .then(([exercises, templates, workouts]) =>
        setLibrary({ exercises, templates, workouts }),
      )
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError('Impossible de charger la bibliothèque. Réessayez.');
        }
      });
    return () => controller.abort();
  }, [version]);

  const latest = useMemo(() => latestItems(library?.workouts ?? []), [library]);
  const selectedCount = selectedExerciseIds.size + selectedTemplateIds.size;

  const create = async (name: string, kind: ExerciseKind) => {
    try {
      const exercise = await createExercise({ name, kind });
      toggleExercise(exercise.id);
    } catch (error) {
      showToast(failureMessage(error, "Impossible de créer l'exercice."));
    }
  };

  /**
   * The exercises picked, the lone ones then those of the favorites, each
   * once, without those the day already holds.
   */
  const picks = (): Picked[] => {
    if (!library) return [];
    const inDay = new Set(
      library.workouts
        .find(({ performedOn }) => performedOn === day)
        ?.items.map(({ exerciseId }) => exerciseId),
    );
    const all: Picked[] = [
      ...library.exercises
        .filter(({ id }) => selectedExerciseIds.has(id))
        .map((exercise) => ({ exercise })),
      ...library.templates
        .filter(({ id }) => selectedTemplateIds.has(id))
        .flatMap(({ items }) =>
          items.map((item) => ({
            exercise: {
              id: item.exerciseId,
              name: item.exerciseName,
              kind: item.kind,
            },
          })),
        ),
    ];
    return all.filter(({ exercise }) => {
      if (inDay.has(exercise.id)) return false;
      inDay.add(exercise.id);
      return true;
    });
  };

  const openReview = async () => {
    const items = await Promise.all(
      picks().map(async ({ exercise }) => {
        const last = await getLastPerformance(exercise.id, day).catch(
          () => null,
        );
        return draftFor(exercise, last);
      }),
    );
    setReview((prev) => ({ key: (prev?.key ?? 0) + 1, items }));
  };

  const header = (
    <FlowHeader
      title="Séance"
      subtitle={formatWeekday(startOfDay(day))}
      onClose={onClose}
      onBack={review ? () => setReview(null) : undefined}
    />
  );

  if (review) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {header}
        <div key={review.key} className="flex flex-1 animate-step-in flex-col">
          <TrainingDayReview
            day={day}
            initialItems={review.items}
            history={library?.workouts ?? []}
            exercises={library?.exercises ?? []}
            onSaved={onAdded}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      <PillTabs
        name="trainingPickerTab"
        options={TAB_OPTIONS}
        value={tab}
        onChange={setTab}
        className="self-start"
      />

      <div key={tab} className="animate-fade-in-up">
        {tab === 'exercises' ? (
          <ExerciseList
            exercises={library?.exercises ?? []}
            isLoading={library === null && !loadError}
            loadError={loadError}
            latest={latest}
            onCreate={(name, kind) => void create(name, kind)}
            renderAction={(exercise) => (
              <SelectToggle
                selected={selectedExerciseIds.has(exercise.id)}
                onToggle={() => toggleExercise(exercise.id)}
              />
            )}
          />
        ) : (
          <TemplateList
            templates={library?.templates ?? []}
            isLoading={library === null && !loadError}
            loadError={loadError}
            latest={latest}
            renderAction={(template) => (
              <SelectToggle
                selected={selectedTemplateIds.has(template.id)}
                onToggle={() => toggleTemplate(template.id)}
              />
            )}
          />
        )}
      </div>

      <SelectionBar count={selectedCount} onNext={() => void openReview()} />
    </div>
  );
}
