import { useEffect, useRef, useState } from 'react';

import { listExercises, listTemplates } from '../components/fitness/api';
import { ExerciseDialog } from '../components/fitness/ExerciseDialog';
import { ExerciseList } from '../components/fitness/ExerciseList';
import { TemplateDialog } from '../components/fitness/TemplateDialog';
import { TemplateList } from '../components/fitness/TemplateList';
import type { Exercise, WorkoutTemplate } from '../components/fitness/types';
import { AddCircleButton } from '../components/ui/AddCircleButton';
import { PillTabs } from '../components/ui/PillTabs';
import { useDataVersion } from '../hooks/useDataVersion';

type Tab = 'favorites' | 'exercises';

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'favorites', label: 'Séances' },
  { value: 'exercises', label: 'Exercices' },
];

/** A list read from the database, with its loading state. */
function useList<T>(read: (signal: AbortSignal) => Promise<T[]>) {
  const version = useDataVersion();
  const [attempt, setAttempt] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    read(controller.signal)
      .then((list) => {
        setItems(list);
        setHasError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHasError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [read, attempt, version]);

  const retry = () => {
    setHasError(false);
    setIsLoading(true);
    setAttempt((count) => count + 1);
  };

  return { items, isLoading, hasError, retry };
}

/**
 * Fitness page, the training library, like the food one: the favorite
 * sessions and the exercises, each with its create and edit dialog. The
 * sessions done are logged from the journal.
 */
export default function FitnessPage() {
  const [activeTab, setActiveTab] = useState<Tab>('favorites');
  const templates = useList(listTemplates);
  const exercises = useList(listExercises);

  const templateDialogRef = useRef<HTMLDialogElement>(null);
  const [templateDialog, setTemplateDialog] = useState<{
    template: WorkoutTemplate | null;
    openCount: number;
  }>({ template: null, openCount: 0 });
  const exerciseDialogRef = useRef<HTMLDialogElement>(null);
  const [exerciseDialog, setExerciseDialog] = useState<{
    exercise: Exercise | null;
    openCount: number;
  }>({ exercise: null, openCount: 0 });

  const openTemplate = (template: WorkoutTemplate | null) => {
    setTemplateDialog(({ openCount }) => ({
      template,
      openCount: openCount + 1,
    }));
    templateDialogRef.current?.showModal();
  };

  const openExercise = (exercise: Exercise | null) => {
    setExerciseDialog(({ openCount }) => ({
      exercise,
      openCount: openCount + 1,
    }));
    exerciseDialogRef.current?.showModal();
  };

  return (
    <div className="flex flex-col gap-6">
      <PillTabs
        name="fitnessPageTab"
        options={TAB_OPTIONS}
        value={activeTab}
        onChange={setActiveTab}
        className="self-start"
      />

      <div key={activeTab} className="animate-fade-in-up">
        {activeTab === 'favorites' ? (
          <TemplateList
            templates={templates.items}
            isLoading={templates.isLoading}
            loadError={
              templates.hasError ? 'Impossible de charger les séances.' : null
            }
            onRetry={templates.retry}
            headerAction={
              <AddCircleButton onClick={() => openTemplate(null)} />
            }
            onEdit={openTemplate}
          />
        ) : (
          <ExerciseList
            exercises={exercises.items}
            isLoading={exercises.isLoading}
            loadError={
              exercises.hasError ? 'Impossible de charger les exercices.' : null
            }
            onRetry={exercises.retry}
            headerAction={
              <AddCircleButton onClick={() => openExercise(null)} />
            }
            onEdit={openExercise}
          />
        )}
      </div>

      <TemplateDialog
        dialogRef={templateDialogRef}
        openCount={templateDialog.openCount}
        template={templateDialog.template}
        exercises={exercises.items}
      />
      <ExerciseDialog
        dialogRef={exerciseDialogRef}
        openCount={exerciseDialog.openCount}
        exercise={exerciseDialog.exercise}
      />
    </div>
  );
}
