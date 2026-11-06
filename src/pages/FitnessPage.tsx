import { useMemo, useRef, useState } from 'react';

import {
  listExercises,
  listTemplates,
  listWorkouts,
} from '../components/fitness/api';
import { ExerciseDialog } from '../components/fitness/ExerciseDialog';
import { ExerciseList } from '../components/fitness/ExerciseList';
import { ExerciseSheet } from '../components/fitness/ExerciseSheet';
import { latestItems } from '../components/fitness/records';
import { TemplateDialog } from '../components/fitness/TemplateDialog';
import { TemplateList } from '../components/fitness/TemplateList';
import type { Exercise, WorkoutTemplate } from '../components/fitness/types';
import { AddCircleButton } from '../components/ui/AddCircleButton';
import { EditIconButton } from '../components/ui/EditIconButton';
import { PillTabs } from '../components/ui/PillTabs';
import { useList } from '../hooks/useList';

type Tab = 'favorites' | 'exercises';

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'exercises', label: 'Exercices' },
  { value: 'favorites', label: 'Séances' },
];

/**
 * Fitness page, the training library, like the food one: the exercises and
 * the favorite sessions, each recalling the last values of its
 * exercises, with their create and edit dialogs. The sessions done are
 * logged from the journal.
 */
export default function FitnessPage() {
  const [activeTab, setActiveTab] = useState<Tab>('exercises');
  const templates = useList(listTemplates);
  const exercises = useList(listExercises);
  const workouts = useList(listWorkouts);
  const latest = useMemo(() => latestItems(workouts.items), [workouts.items]);

  const templateDialogRef = useRef<HTMLDialogElement>(null);
  const [templateDialog, setTemplateDialog] = useState<{
    template: WorkoutTemplate | null;
    openCount: number;
  }>({ template: null, openCount: 0 });
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [sheetExercise, setSheetExercise] = useState<Exercise | null>(null);
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

  const openSheet = (exercise: Exercise) => {
    setSheetExercise(exercise);
    sheetRef.current?.showModal();
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
            latest={latest}
            renderAction={(template) => (
              <EditIconButton onClick={() => openTemplate(template)} />
            )}
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
            latest={latest}
            onOpen={openSheet}
          />
        )}
      </div>

      <TemplateDialog
        dialogRef={templateDialogRef}
        openCount={templateDialog.openCount}
        template={templateDialog.template}
        exercises={exercises.items}
      />
      <ExerciseSheet
        dialogRef={sheetRef}
        exercise={sheetExercise}
        workouts={workouts.items}
        onEdit={(exercise) => {
          sheetRef.current?.close();
          openExercise(exercise);
        }}
      />
      <ExerciseDialog
        dialogRef={exerciseDialogRef}
        openCount={exerciseDialog.openCount}
        exercise={exerciseDialog.exercise}
      />
    </div>
  );
}
