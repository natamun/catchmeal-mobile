import { useId, useRef, useState, type RefObject } from 'react';

import { failureMessage } from '../../utils/failureMessage';
import { BaseDialog } from '../ui/BaseDialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { PillTabs } from '../ui/PillTabs';
import { useToast } from '../ui/toastContext';
import { createExercise, deleteExercise, updateExercise } from './api';
import type { Exercise, ExerciseKind } from './types';

const NAME_MAX = 80;

const KIND_OPTIONS: { value: ExerciseKind; label: string }[] = [
  { value: 'STRENGTH', label: 'Musculation' },
  { value: 'TREADMILL', label: 'Tapis' },
  { value: 'CARDIO', label: 'Cardio' },
];

const KIND_HINTS: Record<ExerciseKind, string> = {
  STRENGTH: 'Des séries de répétitions à une charge.',
  TREADMILL: 'Une durée, une vitesse et une pente.',
  CARDIO: 'Une durée, à effort modéré.',
};

interface FormProps {
  exercise: Exercise | null;
  onSaved: () => void;
}

/** The form inside the dialog, remounted at each opening (key). */
function ExerciseForm({ exercise, onSaved }: FormProps) {
  const formId = useId();
  const showToast = useToast();
  const [name, setName] = useState(exercise?.name ?? '');
  const [kind, setKind] = useState<ExerciseKind>(exercise?.kind ?? 'STRENGTH');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim() === '') {
      setError('Nom requis');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const input = { name, kind };
      if (exercise) {
        await updateExercise(exercise.id, input);
      } else {
        await createExercise(input);
      }
      onSaved();
      showToast(exercise ? 'Exercice modifié' : 'Exercice ajouté');
    } catch (err) {
      setError(failureMessage(err, "Impossible d'enregistrer l'exercice."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
      autoComplete="off"
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${formId}-name`} className={LABEL_CLASS}>
          Nom
        </label>
        <Input
          id={`${formId}-name`}
          type="text"
          placeholder="Ex : Presse à cuisses"
          maxLength={NAME_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Type</span>
        <PillTabs
          name={`${formId}-kind`}
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
          className="self-start"
        />
        <p className="text-sm text-theme-500">{KIND_HINTS[kind]}</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full cursor-pointer rounded-xl bg-theme-500 px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-theme-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  );
}

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  openCount: number;
  exercise: Exercise | null;
}

/**
 * Dialog to add an exercise to the library, or to rename, retype or delete
 * one. Deleting archives it: the past sessions keep it.
 */
export function ExerciseDialog({ dialogRef, openCount, exercise }: Props) {
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const showToast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!exercise) return;
    setIsDeleting(true);
    try {
      await deleteExercise(exercise.id);
      dialogRef.current?.close();
      showToast('Exercice supprimé');
    } catch {
      showToast('Suppression impossible, réessaie.');
    } finally {
      setIsDeleting(false);
      confirmDialogRef.current?.close();
    }
  };

  return (
    <>
      <BaseDialog
        dialogRef={dialogRef}
        title={exercise ? "Modifier l'exercice" : 'Nouvel exercice'}
        maxWidth="sm"
        onDelete={
          exercise ? () => confirmDialogRef.current?.showModal() : undefined
        }
      >
        <ExerciseForm
          key={openCount}
          exercise={exercise}
          onSaved={() => dialogRef.current?.close()}
        />
      </BaseDialog>

      <ConfirmDialog
        dialogRef={confirmDialogRef}
        title="Supprimer cet exercice ?"
        description={`${exercise?.name ?? 'Cet exercice'} disparaît de la bibliothèque. Les séances passées le gardent.`}
        confirmLabel="Supprimer"
        pendingLabel="Suppression..."
        isPending={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
