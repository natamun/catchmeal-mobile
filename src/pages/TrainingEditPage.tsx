import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { listExercises, listWorkouts } from '../components/fitness/api';
import { TrainingDayReview } from '../components/fitness/TrainingDayReview';
import type { Workout } from '../components/fitness/types';
import { draftsOf } from '../components/fitness/workoutDraft';
import { useFlow } from '../components/layout/flowContext';
import { FlowHeader } from '../components/layout/FlowHeader';
import { PageLoading } from '../components/ui/Card';
import { useList } from '../hooks/useList';
import { journalPath, parseDateParam } from '../routing/journal';
import { useGoBack } from '../routing/navigation';
import { toDateKey } from '../utils/dateKey';
import { formatWeekday } from '../utils/format';

/**
 * /home/training/edit: the whole session of a day, its sets to change, then
 * save. Saving tells the new records.
 */
export default function TrainingEditPage() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const date = useMemo(() => parseDateParam(dateParam), [dateParam]);
  const day = toDateKey(date);
  const backToJournal = useGoBack(journalPath(date));
  const flow = useFlow();
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [hasError, setHasError] = useState(false);
  // Followed, unlike the session: a note written here shows at once.
  const exercises = useList(listExercises);

  // Read once: the page edits the session as it was when it opened.
  useEffect(() => {
    const controller = new AbortController();
    listWorkouts(controller.signal)
      .then(setWorkouts)
      .catch(() => {
        if (!controller.signal.aborted) setHasError(true);
      });
    return () => controller.abort();
  }, []);

  const close = () => flow.close(backToJournal);
  const session = workouts?.find(({ performedOn }) => performedOn === day);

  let content;
  if (hasError) {
    content = (
      <p className="py-8 text-center text-sm text-theme-600">
        Impossible de charger la séance. Réessayez.
      </p>
    );
  } else if (!workouts) {
    content = <PageLoading />;
  } else {
    content = (
      <TrainingDayReview
        day={day}
        isEdit
        initialItems={session ? draftsOf(session) : []}
        history={workouts}
        exercises={exercises.items}
        onSaved={close}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <FlowHeader
        title="Séance"
        subtitle={formatWeekday(date)}
        onClose={close}
      />
      {content}
    </div>
  );
}
