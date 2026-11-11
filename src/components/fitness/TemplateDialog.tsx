import { useId, useRef, useState, type RefObject } from 'react';
import { X } from 'lucide-react';

import { failureMessage } from '../../utils/failureMessage';
import { BaseDialog } from '../ui/BaseDialog';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { useToast } from '../ui/toastContext';
import { createTemplate, deleteTemplate, updateTemplate } from './api';
import { ExercisePicker } from './ExercisePicker';
import {
  templateDrafts,
  templateItemDraft,
  templateToInput,
  type TemplateItemDraft,
} from './templateDraft';
import type { Exercise, WorkoutTemplate } from './types';

/** Empty values of a favorite start from the last time: say so. */

interface FormProps {
  template: WorkoutTemplate | null;
  exercises: Exercise[];
  dialogNode: HTMLDialogElement | null;
  onSaved: () => void;
  hasDeleteFailed: boolean;
}

/** The form inside the dialog, remounted at each opening (key). */
function TemplateForm({
  template,
  exercises,
  dialogNode,
  onSaved,
  hasDeleteFailed,
}: FormProps) {
  const formId = useId();
  const showToast = useToast();
  const [name, setName] = useState(template?.name ?? '');
  const [items, setItems] = useState<TemplateItemDraft[]>(() =>
    template ? templateDrafts(template) : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = templateToInput(name, items);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (template) {
        await updateTemplate(template.id, result.input);
      } else {
        await createTemplate(result.input);
      }
      onSaved();
      showToast(
        template ? 'Séance favorite modifiée' : 'Séance favorite ajoutée',
      );
    } catch (err) {
      setError(failureMessage(err, "Impossible d'enregistrer la séance."));
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
          placeholder="Ex : Full body"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <ExercisePicker
        exercises={exercises}
        dialogNode={dialogNode}
        onPick={(exercise) =>
          setItems((current) => [...current, templateItemDraft(exercise)])
        }
      />

      {items.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-theme-100 pt-5">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex animate-fade-in-up flex-col gap-2.5 rounded-xl border border-theme-200 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-base font-medium text-theme-800">
                  {item.name}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setItems((current) =>
                      current.filter((other) => other.key !== item.key),
                    )
                  }
                  className="tap-area relative shrink-0 cursor-pointer text-theme-400 transition-colors hover:text-red-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-theme-500">
                Reprend les séries de la dernière fois.
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 border-t border-theme-100 pt-5">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {hasDeleteFailed && (
          <p className="text-sm text-red-500">
            Impossible de supprimer la séance. Réessayez.
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer la séance'}
        </button>
      </div>
    </form>
  );
}

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  openCount: number;
  template: WorkoutTemplate | null;
  exercises: Exercise[];
}

/**
 * Dialog to create a favorite session, or to edit or delete one. A cardio
 * exercise may set its values; left empty, they come from the last time.
 */
export function TemplateDialog({
  dialogRef,
  openCount,
  template,
  exercises,
}: Props) {
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const showToast = useToast();
  const [dialogNode, setDialogNode] = useState<HTMLDialogElement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasDeleteFailed, setHasDeleteFailed] = useState(false);

  const handleDelete = async () => {
    if (!template) return;
    setHasDeleteFailed(false);
    setIsDeleting(true);
    try {
      await deleteTemplate(template.id);
      dialogRef.current?.close();
      showToast('Séance favorite supprimée');
    } catch {
      setHasDeleteFailed(true);
    } finally {
      setIsDeleting(false);
      confirmDialogRef.current?.close();
    }
  };

  return (
    <>
      <BaseDialog
        dialogRef={dialogRef}
        title={template ? 'Modifier la séance' : 'Nouvelle séance favorite'}
        onDialogNode={setDialogNode}
        onClose={() => setHasDeleteFailed(false)}
        onDelete={
          template ? () => confirmDialogRef.current?.showModal() : undefined
        }
      >
        <TemplateForm
          key={openCount}
          template={template}
          exercises={exercises}
          dialogNode={dialogNode}
          hasDeleteFailed={hasDeleteFailed}
          onSaved={() => dialogRef.current?.close()}
        />
      </BaseDialog>

      <ConfirmDialog
        dialogRef={confirmDialogRef}
        title="Supprimer cette séance favorite ?"
        description={`${template?.name ?? 'Cette séance'} disparaît des favorites. Les séances faites avec restent.`}
        confirmLabel="Supprimer"
        pendingLabel="Suppression..."
        isPending={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
