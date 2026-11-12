import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  listExercises,
  listTemplates,
  listWorkouts,
} from '../components/fitness/api';
import { ExerciseDialog } from '../components/fitness/ExerciseDialog';
import { ExerciseList } from '../components/fitness/ExerciseList';
import { ExerciseSheet } from '../components/fitness/ExerciseSheet';
import { latestItems } from '../components/fitness/records';
import { TemplateList } from '../components/fitness/TemplateList';
import type { Exercise } from '../components/fitness/types';
import { AddCircleButton } from '../components/ui/AddCircleButton';
import { PillTabs } from '../components/ui/PillTabs';
import { useList } from '../hooks/useList';
import { templatePath } from '../routing/recipes';

type Tab = 'favorites' | 'exercises';

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'exercises', label: 'Exercices' },
  { value: 'favorites', label: 'Séances' },
];

/**
 * Fitness page, the training library, like the food one: the exercises and
 * the favorite sessions, each recalling the last values of its exercises. An
 * exercise is created or edited in a dialog, a favorite on a page of its own.
 * The sessions done are logged from the journal.
 */
export default function FitnessPage() {
  const [activeTab, setActiveTab] = useState<Tab>('exercises');
  const templates = useList(listTemplates);
  const exercises = useList(listExercises);
  const workouts = useList(listWorkouts);
  const latest = useMemo(() => latestItems(workouts.items), [workouts.items]);

  const navigate = useNavigate();
  const sheetRef = useRef<HTMLDialogElement>(null);
  // The id, so the sheet follows the library when its note changes.
  const [sheet, setSheet] = useState<{ id: number | null; openCount: number }>({
    id: null,
    openCount: 0,
  });
  const sheetExercise =
    exercises.items.find(({ id }) => id === sheet.id) ?? null;
  const exerciseDialogRef = useRef<HTMLDialogElement>(null);
  const [exerciseDialog, setExerciseDialog] = useState<{
    exercise: Exercise | null;
    openCount: number;
  }>({ exercise: null, openCount: 0 });

  const openExercise = (exercise: Exercise | null) => {
    setExerciseDialog(({ openCount }) => ({
      exercise,
      openCount: openCount + 1,
    }));
    exerciseDialogRef.current?.showModal();
  };

  const openSheet = (exercise: Exercise) => {
    setSheet(({ openCount }) => ({
      id: exercise.id,
      openCount: openCount + 1,
    }));
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
              <AddCircleButton
                onClick={() => void navigate(templatePath('new'))}
              />
            }
            latest={latest}
            onOpen={(template) => void navigate(templatePath(template.id))}
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

      <ExerciseSheet
        dialogRef={sheetRef}
        exercise={sheetExercise}
        openCount={sheet.openCount}
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
