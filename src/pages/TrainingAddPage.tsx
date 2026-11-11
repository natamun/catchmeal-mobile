import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { TrainingPicker } from '../components/home/TrainingPicker';
import { useFlow } from '../components/layout/flowContext';
import { useToast } from '../components/ui/toastContext';
import { journalPath, parseDateParam } from '../routing/journal';
import { useGoBack } from '../routing/navigation';
import { toDateKey } from '../utils/dateKey';

/**
 * /home/training: adds exercises to the session of a day, then goes back to
 * the journal.
 */
export default function TrainingAddPage() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const date = useMemo(() => parseDateParam(dateParam), [dateParam]);
  const backToJournal = useGoBack(journalPath(date));
  const flow = useFlow();
  const showToast = useToast();

  return (
    <TrainingPicker
      day={toDateKey(date)}
      onClose={() => flow.close(backToJournal)}
      onAdded={() => {
        showToast('Ajouté à la séance');
        flow.close(backToJournal);
      }}
    />
  );
}
