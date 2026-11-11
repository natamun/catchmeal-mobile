import { useState, type RefObject } from 'react';

import { useFormValidation } from '../../hooks/useFormValidation';
import { toDateKey } from '../../utils/dateKey';
import { parseDecimal } from '../../utils/decimals';
import { failureMessage } from '../../utils/failureMessage';
import { createMeal } from '../meal/api';
import {
  EMPTY_QUICK_ADD_FORM,
  NUTRITION_FIELDS,
  validateQuickAddForm,
} from '../meal/quickMealAdd';
import { MEAL_TYPE_LABELS, type MealType } from '../meal/types';
import { BaseDialog } from '../ui/BaseDialog';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { FieldError } from '../ui/FieldError';
import { Input } from '../ui/Input';
import { SelectDropdown } from '../ui/SelectDropdown';

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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setMealType(defaultMealType());
    setForm(EMPTY_QUICK_ADD_FORM);
    resetValidation();
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
    <BaseDialog dialogRef={dialogRef} title="Ajout rapide" onClose={reset}>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
        autoComplete="off"
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="quick-add-meal-type"
            className="text-xs text-theme-500"
          >
            Catégorie
          </label>
          <SelectDropdown
            id="quick-add-meal-type"
            value={mealType}
            options={MEAL_TYPE_OPTIONS}
            onChange={(value) => setMealType(value as MealType)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {NUTRITION_FIELDS.map(({ field, label }) => (
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
          className={PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? 'Enregistrement...' : 'Ajouter au journal'}
        </button>
      </form>
    </BaseDialog>
  );
}
