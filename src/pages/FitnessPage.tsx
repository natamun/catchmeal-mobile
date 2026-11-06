import { useEffect, useRef, useState } from 'react';

import { listExercises, listWorkouts } from '../components/fitness/api';
import { ExerciseDialog } from '../components/fitness/ExerciseDialog';
import { ExerciseList } from '../components/fitness/ExerciseList';
import type { Exercise, Workout } from '../components/fitness/types';
import { WorkoutDialog } from '../components/fitness/WorkoutDialog';
import { WorkoutList } from '../components/fitness/WorkoutList';
import { AddCircleButton } from '../components/ui/AddCircleButton';
import { PillTabs } from '../components/ui/PillTabs';
import { useDataVersion } from '../hooks/useDataVersion';

type Tab = 'sessions' | 'exercises';

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'sessions', label: 'Séances' },
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
 * Fitness page with two tabs: the training sessions, and the exercise
 * library they are made of, each with its create and edit dialog.
 */
export default function FitnessPage() {
  const [activeTab, setActiveTab] = useState<Tab>('sessions');
  const workouts = useList(listWorkouts);
  const exercises = useList(listExercises);

  const workoutDialogRef = useRef<HTMLDialogElement>(null);
  const [workoutDialog, setWorkoutDialog] = useState<{
    workout: Workout | null;
    openCount: number;
  }>({ workout: null, openCount: 0 });
  const exerciseDialogRef = useRef<HTMLDialogElement>(null);
  const [exerciseDialog, setExerciseDialog] = useState<{
    exercise: Exercise | null;
    openCount: number;
  }>({ exercise: null, openCount: 0 });

  const openWorkout = (workout: Workout | null) => {
    setWorkoutDialog(({ openCount }) => ({
      workout,
      openCount: openCount + 1,
    }));
    workoutDialogRef.current?.showModal();
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
        {activeTab === 'sessions' ? (
          <WorkoutList
            workouts={workouts.items}
            isLoading={workouts.isLoading}
            loadError={
              workouts.hasError ? 'Impossible de charger les séances.' : null
            }
            onRetry={workouts.retry}
            headerAction={<AddCircleButton onClick={() => openWorkout(null)} />}
            onEdit={openWorkout}
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

      <WorkoutDialog
        dialogRef={workoutDialogRef}
        openCount={workoutDialog.openCount}
        workout={workoutDialog.workout}
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
