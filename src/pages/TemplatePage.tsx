import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

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
import { PageLoading } from '../components/ui/Card';
import { useList } from '../hooks/useList';
import { useGoBack } from '../routing/navigation';
import { PATHS } from '../routing/paths';
import { templatePath } from '../routing/recipes';

/** What the page is opened with: a new favorite can start as a copy. */
interface TemplateState {
  copyOf?: number;
}

/**
 * /fitness/session/:templateId: a favorite session to edit, or "new" to
 * write one, maybe as a copy of another. Slides in over the fitness page,
 * like a library meal.
 */
export default function TemplatePage() {
  // A copy opens on the same route: the page starts again for it.
  return <TemplateScreen key={useLocation().key} />;
}

function TemplateScreen() {
  const { templateId = '' } = useParams();
  const state = useLocation().state as TemplateState | null;
  const navigate = useNavigate();
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
  const copyOf =
    (isNew && templates.items.find(({ id }) => id === state?.copyOf)) || null;
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
    content = <PageLoading />;
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
        copyOf={copyOf}
        exercises={exercises.items}
        latest={latest}
        onClose={close}
        onCopy={() =>
          void navigate(templatePath('new'), {
            state: { copyOf: opened?.id } satisfies TemplateState,
          })
        }
        onDone={close}
      />
    );
  }

  return <div className="flex flex-1 flex-col gap-4">{content}</div>;
}
