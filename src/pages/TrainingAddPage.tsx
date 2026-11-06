import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { TrainingPicker } from '../components/home/TrainingPicker';
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

  return (
    <TrainingPicker
      day={toDateKey(date)}
      onClose={backToJournal}
      onAdded={backToJournal}
    />
  );
}
