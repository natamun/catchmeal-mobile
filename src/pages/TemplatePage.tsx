import { useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useParams } from 'react-router';

import {
  listExercises,
  listTemplates,
  listWorkouts,
} from '../components/fitness/api';
import { latestItems } from '../components/fitness/records';
import { TemplateForm } from '../components/fitness/TemplateForm';
import type { WorkoutTemplate } from '../components/fitness/types';
import { useFlow } from '../components/layout/flowContext';
import { FlowHeader } from '../components/layout/FlowHeader';
import { useList } from '../hooks/useList';
import { useGoBack } from '../routing/navigation';
import { PATHS } from '../routing/paths';

/**
 * /fitness/session/:templateId: a favorite session to edit, or "new" to
 * write one. Slides in over the fitness page, like a library meal.
 */
export default function TemplatePage() {
  const { templateId = '' } = useParams();
  const flow = useFlow();
  const templates = useList(listTemplates);
  const exercises = useList(listExercises);
  const workouts = useList(listWorkouts);
  const latest = useMemo(() => latestItems(workouts.items), [workouts.items]);
  const backToFitness = useGoBack(PATHS.fitness);
  const close = () => flow.close(backToFitness);
  const isNew = templateId === 'new';
  const isReady = !templates.isLoading && !exercises.isLoading;

  // The favorite as the page opened on it: it stays while the page slides
  // away once deleted.
  const [opened, setOpened] = useState<WorkoutTemplate | null | undefined>(
    undefined,
  );
  if (isReady && opened === undefined) {
    setOpened(
      isNew
        ? null
        : (templates.items.find(({ id }) => id === Number(templateId)) ?? null),
    );
  }

  let content;
  if (templates.hasError || exercises.hasError) {
    content = (
      <>
        <FlowHeader title="Séance" subtitle="Séance favorite" onClose={close} />
        <p className="py-8 text-center text-sm text-theme-600">
          Impossible de charger la séance. Réessayez.
        </p>
      </>
    );
  } else if (opened === undefined) {
    content = (
      <div className="flex justify-center py-16">
        <LoaderCircle className="h-6 w-6 animate-spin text-theme-400" />
      </div>
    );
  } else if (!isNew && opened === null) {
    content = (
      <>
        <FlowHeader title="Séance" subtitle="Séance favorite" onClose={close} />
        <p className="py-8 text-center text-sm text-theme-600">
          Cette séance n'existe plus.
        </p>
      </>
    );
  } else {
    content = (
      <TemplateForm
        template={opened}
        exercises={exercises.items}
        latest={latest}
        onClose={close}
        onDone={close}
      />
    );
  }

  return <div className="flex flex-1 flex-col gap-4">{content}</div>;
}
