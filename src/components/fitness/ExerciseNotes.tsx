import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { failureMessage } from '../../utils/failureMessage';
import { useToast } from '../ui/toastContext';
import { setExerciseNotes } from './api';

const MAX_LENGTH = 1000;

/** How long typing pauses before the note is saved. */
const SAVE_DELAY_MS = 800;

interface Props {
  exerciseId: number;
  notes: string | null;
}

/**
 * The user's own note on an exercise, kept from one session to the next: a
 * framed field written in directly, saved as typing pauses, on leaving the
 * field and when it goes away.
 */
export function ExerciseNotes({ exerciseId, notes }: Props) {
  const showToast = useToast();
  const id = useId();
  const [text, setText] = useState(notes ?? '');
  const latest = useRef(text);
  const saved = useRef(text);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(() => {
    clearTimeout(timer.current);
    const value = latest.current;
    if (value === saved.current) return;
    saved.current = value;
    setExerciseNotes(exerciseId, value).catch((error: unknown) =>
      showToast(failureMessage(error, "Impossible d'enregistrer la note.")),
    );
  }, [exerciseId, showToast]);

  // The sheet may close before typing pauses: what is left is saved then.
  useEffect(() => save, [save]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-theme-500">
        Note
      </label>
      <textarea
        id={id}
        rows={1}
        maxLength={MAX_LENGTH}
        placeholder="Ajouter une note"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          latest.current = e.target.value;
          clearTimeout(timer.current);
          timer.current = setTimeout(save, SAVE_DELAY_MS);
        }}
        onBlur={save}
        className="field-sizing-content max-h-48 w-full resize-none overflow-y-auto rounded-xl bg-theme-50 px-3 py-2 text-base leading-relaxed text-pretty text-theme-800 outline-none placeholder:text-theme-400 focus:ring-2 focus:ring-theme-400"
      />
    </div>
  );
}
