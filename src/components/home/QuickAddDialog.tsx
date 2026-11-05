import { useState, type RefObject } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronRight } from 'lucide-react';

import { useFormValidation } from '../../hooks/useFormValidation';
import { toDateKey } from '../../utils/dateKey';
import { parseDecimal } from '../../utils/decimals';
import { failureMessage } from '../../utils/failureMessage';
import { createMeal } from '../meal/api';
import {
  EMPTY_QUICK_ADD_FORM,
  QUICK_ADD_FIELDS,
  validateQuickAddForm,
} from '../meal/quickMealAdd';
import { MEAL_TYPE_LABELS, type MealType } from '../meal/types';
import { BaseDialog } from '../ui/BaseDialog';
import { DropdownPanel } from '../ui/DropdownPanel';
import { FieldError } from '../ui/FieldError';
import { Input } from '../ui/Input';

const MEAL_TYPE_OPTIONS = (Object.keys(MEAL_TYPE_LABELS) as MealType[]).map(
  (value) => ({ value, label: MEAL_TYPE_LABELS[value] }),
);

/**
 * Suggests a section from the time of day: breakfast before 10:00, lunch before
 * 15:00, snack before 18:00, then dinner.
 */
function defaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) {
    return 'BREAKFAST';
  }
  if (hour < 15) {
    return 'LUNCH';
  }
  if (hour < 18) {
    return 'SNACK';
  }
  return 'DINNER';
}

interface QuickAddDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  date: Date;
  onSaved: () => void;
}

/**
 * Logs calories and macros typed by hand, without a food of the library, into
 * one section of the day.
 */
export function QuickAddDialog({
  dialogRef,
  date,
  onSaved,
}: QuickAddDialogProps) {
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const {
    form,
    setForm,
    handleFocus,
    handleBlur,
    handleChange,
    isInvalid,
    errorMessage,
    attemptSubmit,
    resetValidation,
  } = useFormValidation(EMPTY_QUICK_ADD_FORM, validateQuickAddForm);
  const [dialogNode, setDialogNode] = useState<HTMLDialogElement | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setMealType(defaultMealType());
    setForm(EMPTY_QUICK_ADD_FORM);
    resetValidation();
    setCategoryOpen(false);
    setError(null);
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!attemptSubmit()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createMeal({
        typeMeal: mealType,
        loggedAt: toDateKey(date),
        items: [
          {
            quantity: 1,
            kcal: parseDecimal(form.kcal) ?? 0,
            protein: parseDecimal(form.protein) ?? 0,
            carbs: parseDecimal(form.carbs) ?? 0,
            fat: parseDecimal(form.fat) ?? 0,
          },
        ],
      });
      dialogRef.current?.close();
      onSaved();
    } catch (err: unknown) {
      setError(failureMessage(err, 'Une erreur est survenue, réessayez.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseDialog
      dialogRef={dialogRef}
      title="Ajout rapide"
      onClose={reset}
      onDialogNode={setDialogNode}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
        autoComplete="off"
        className="flex flex-col gap-5"
      >
        <Popover.Root open={categoryOpen} onOpenChange={setCategoryOpen}>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="quick-add-meal-type"
              className="text-xs text-theme-500"
            >
              Catégorie
            </label>
            <Popover.Trigger asChild>
              <button
                id="quick-add-meal-type"
                type="button"
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-theme-200 bg-surface px-4 py-2.5 text-sm text-theme-800 transition-colors hover:bg-theme-50 data-[state=open]:bg-theme-50"
              >
                {MEAL_TYPE_LABELS[mealType]}
                <ChevronRight
                  className={`h-4 w-4 text-theme-400 transition-transform ${categoryOpen ? 'rotate-90' : ''}`}
                />
              </button>
            </Popover.Trigger>
          </div>
          <DropdownPanel container={dialogNode} matchAnchorWidth moveFocus>
            {MEAL_TYPE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMealType(value);
                  setCategoryOpen(false);
                }}
                className={`cursor-pointer border-t border-theme-100 px-4 py-2 text-left text-sm transition-colors first:border-t-0 hover:bg-theme-50 ${
                  value === mealType
                    ? 'font-semibold text-theme-800'
                    : 'text-theme-600'
                }`}
              >
                {label}
              </button>
            ))}
          </DropdownPanel>
        </Popover.Root>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ADD_FIELDS.map(({ field, label }) => (
            <div key={field} className="relative flex flex-col gap-1">
              <label
                htmlFor={`quick-add-${field}`}
                className="text-xs text-theme-500"
              >
                {label}
              </label>
              <Input
                id={`quick-add-${field}`}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={form[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                onFocus={() => handleFocus(field)}
                onBlur={() => handleBlur(field)}
                data-invalid={isInvalid(field)}
                autoComplete="off"
              />
              <FieldError message={errorMessage(field)} />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full cursor-pointer rounded-xl bg-theme-500 px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-theme-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Enregistrement...' : 'Ajouter au journal'}
        </button>
      </form>
    </BaseDialog>
  );
}
