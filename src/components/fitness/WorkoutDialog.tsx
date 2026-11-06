import { useId, useRef, useState, type RefObject } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Plus, X } from 'lucide-react';

import { startOfDay, toDateKey } from '../../utils/dateKey';
import { failureMessage } from '../../utils/failureMessage';
import { formatDayMonth } from '../../utils/format';
import { BaseDialog } from '../ui/BaseDialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DropdownPanel } from '../ui/DropdownPanel';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { useToast } from '../ui/toastContext';
import {
  createWorkout,
  deleteWorkout,
  getLastPerformance,
  updateWorkout,
} from './api';
import { matchesSearch } from './search';
import type { Exercise, Workout } from './types';
import {
  draftFor,
  draftsOf,
  draftToInput,
  type ItemDraft,
  type SetDraft,
} from './workoutDraft';

const SMALL_LABEL = 'text-xs text-theme-500';
const ICON_BUTTON =
  'tap-area relative shrink-0 cursor-pointer text-theme-400 transition-colors hover:text-red-500';

interface ItemEditorProps {
  item: ItemDraft;
  onChange: (item: ItemDraft) => void;
  onRemove: () => void;
}

/** One number field of a cardio exercise, with its label above it. */
function CardioField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className={SMALL_LABEL}>
        {label}
      </label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        className="text-center"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * An exercise of the session: its sets for strength, its duration for
 * cardio, with the speed and incline on a treadmill.
 */
function ItemEditor({ item, onChange, onRemove }: ItemEditorProps) {
  const setSet = (index: number, set: SetDraft) =>
    onChange({
      ...item,
      sets: item.sets.map((current, i) => (i === index ? set : current)),
    });

  return (
    <li className="flex animate-fade-in-up flex-col gap-2.5 rounded-xl border border-theme-200 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-base font-medium text-theme-800">
          {item.name}
        </span>
        <button type="button" onClick={onRemove} className={ICON_BUTTON}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {item.kind === 'STRENGTH' && (
        <>
          {item.sets.map((set, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-center text-sm font-semibold text-theme-400 tabular-nums">
                {index + 1}
              </span>
              <div className="w-18 shrink-0">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="reps"
                  className="px-2 text-center"
                  value={set.reps}
                  onChange={(e) =>
                    setSet(index, { ...set, reps: e.target.value })
                  }
                />
              </div>
              <span className="text-theme-400">×</span>
              <div className="w-20 shrink-0">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  className="px-2 text-center"
                  value={set.weight}
                  onChange={(e) =>
                    setSet(index, { ...set, weight: e.target.value })
                  }
                />
              </div>
              <span className="text-sm text-theme-500">kg</span>
              {item.sets.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...item,
                      sets: item.sets.filter((_, i) => i !== index),
                    })
                  }
                  className={`${ICON_BUTTON} ml-auto`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...item,
                sets: [
                  ...item.sets,
                  item.sets.at(-1) ?? { reps: '', weight: '' },
                ],
              })
            }
            className="flex cursor-pointer items-center gap-1.5 self-start rounded-lg py-1 text-sm font-medium text-theme-600 transition-colors hover:text-theme-800"
          >
            <Plus className="h-4 w-4" />
            Ajouter une série
          </button>
        </>
      )}

      {item.kind !== 'STRENGTH' && (
        <div className="grid grid-cols-3 gap-2">
          <CardioField
            label="Durée (min)"
            placeholder="30"
            value={item.duration}
            onChange={(duration) => onChange({ ...item, duration })}
          />
          {item.kind === 'TREADMILL' && (
            <>
              <CardioField
                label="Vitesse (km/h)"
                placeholder="5"
                value={item.speed}
                onChange={(speed) => onChange({ ...item, speed })}
              />
              <CardioField
                label="Pente (%)"
                placeholder="0"
                value={item.incline}
                onChange={(incline) => onChange({ ...item, incline })}
              />
            </>
          )}
        </div>
      )}
    </li>
  );
}

interface FormProps {
  workout: Workout | null;
  exercises: Exercise[];
  dialogNode: HTMLDialogElement | null;
  onSaved: () => void;
  hasDeleteFailed: boolean;
}

/**
 * The form inside the dialog, remounted at each opening (key) so it starts
 * from the right session, or from an empty one dated today.
 */
function WorkoutForm({
  workout,
  exercises,
  dialogNode,
  onSaved,
  hasDeleteFailed,
}: FormProps) {
  const formId = useId();
  const showToast = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const [performedOn, setPerformedOn] = useState(
    workout?.performedOn ?? toDateKey(new Date()),
  );
  const [duration, setDuration] = useState(
    workout?.durationMinutes ? String(workout.durationMinutes) : '',
  );
  const [items, setItems] = useState<ItemDraft[]>(() =>
    workout ? draftsOf(workout) : [],
  );
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const results = exercises.filter(
    (exercise) => !exercise.archived && matchesSearch(exercise.name, search),
  );
  const isSearchOpen = isSearchFocused && results.length > 0;

  const addExercise = async (exercise: Exercise) => {
    setSearch('');
    searchRef.current?.blur();
    const key = crypto.randomUUID();
    setItems((current) => [...current, draftFor(exercise, null, key)]);
    // Starts from the last time on this exercise, once it is read.
    const last = await getLastPerformance(exercise.id, workout?.id).catch(
      () => null,
    );
    if (last) {
      setItems((current) =>
        current.map((item) =>
          item.key === key ? draftFor(exercise, last, key) : item,
        ),
      );
    }
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = draftToInput({ performedOn, name: '', duration, items });
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (workout) {
        await updateWorkout(workout.id, result.input);
      } else {
        await createWorkout(result.input);
      }
      onSaved();
      showToast(workout ? 'Séance modifiée' : 'Séance enregistrée');
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
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${formId}-date`} className={LABEL_CLASS}>
            Date
          </label>
          <Input
            id={`${formId}-date`}
            type="date"
            value={performedOn}
            onChange={(e) => setPerformedOn(e.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${formId}-duration`} className={LABEL_CLASS}>
            Durée <span className="normal-case">(min)</span>
          </label>
          <Input
            id={`${formId}-duration`}
            type="text"
            inputMode="numeric"
            placeholder="Ex : 60"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
      </div>

      <Popover.Root open={isSearchOpen} onOpenChange={() => {}}>
        <Popover.Anchor className="flex flex-col gap-1.5">
          <label htmlFor={`${formId}-search`} className={LABEL_CLASS}>
            Ajouter un exercice
          </label>
          <Input
            ref={searchRef}
            id={`${formId}-search`}
            type="text"
            placeholder="Rechercher un exercice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </Popover.Anchor>
        <DropdownPanel container={dialogNode} matchAnchorWidth>
          {results.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void addExercise(exercise)}
              className="w-full cursor-pointer border-t border-theme-100 px-4 py-2.5 text-left text-sm text-theme-800 transition-colors first:border-t-0 hover:bg-theme-50"
            >
              {exercise.name}
            </button>
          ))}
        </DropdownPanel>
      </Popover.Root>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-theme-100 pt-5">
          {items.map((item) => (
            <ItemEditor
              key={item.key}
              item={item}
              onChange={(changed) =>
                setItems((current) =>
                  current.map((other) =>
                    other.key === changed.key ? changed : other,
                  ),
                )
              }
              onRemove={() =>
                setItems((current) =>
                  current.filter((other) => other.key !== item.key),
                )
              }
            />
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 border-t border-theme-100 pt-5">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {hasDeleteFailed && (
          <p className="text-sm text-red-500">
            Impossible de supprimer la séance. Réessaie.
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full cursor-pointer rounded-xl bg-theme-500 px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-theme-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  openCount: number;
  workout: Workout | null;
  exercises: Exercise[];
}

/** Dialog to log a training session, or to edit or delete one. */
export function WorkoutDialog({
  dialogRef,
  openCount,
  workout,
  exercises,
}: Props) {
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const showToast = useToast();
  const [dialogNode, setDialogNode] = useState<HTMLDialogElement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasDeleteFailed, setHasDeleteFailed] = useState(false);
  const day = workout ? formatDayMonth(startOfDay(workout.performedOn)) : '';

  const handleDelete = async () => {
    if (!workout) return;
    setHasDeleteFailed(false);
    setIsDeleting(true);
    try {
      await deleteWorkout(workout.id);
      dialogRef.current?.close();
      showToast('Séance supprimée');
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
        title={workout ? `Séance du ${day}` : 'Nouvelle séance'}
        onDialogNode={setDialogNode}
        onClose={() => setHasDeleteFailed(false)}
        onDelete={
          workout ? () => confirmDialogRef.current?.showModal() : undefined
        }
      >
        <WorkoutForm
          key={openCount}
          workout={workout}
          exercises={exercises}
          dialogNode={dialogNode}
          hasDeleteFailed={hasDeleteFailed}
          onSaved={() => dialogRef.current?.close()}
        />
      </BaseDialog>

      <ConfirmDialog
        dialogRef={confirmDialogRef}
        title="Supprimer cette séance ?"
        description={`La séance du ${day} sera supprimée avec ses exercices.`}
        confirmLabel="Supprimer"
        pendingLabel="Suppression..."
        isPending={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
