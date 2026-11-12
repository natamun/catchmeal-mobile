import { useState } from 'react';
import { Copy, Zap } from 'lucide-react';

import { useFormValidation } from '../../hooks/useFormValidation';
import { useTimeout } from '../../hooks/useTimeout';
import { parseDecimal } from '../../utils/decimals';
import { failureMessage } from '../../utils/failureMessage';
import { copyName } from '../../utils/format';
import { MAX_LENGTH, maxLengthMessage } from '../../utils/validation';
import { matchesFood } from '../food/search';
import type { FoodItem } from '../food/types';
import { FlowFooter } from '../layout/FlowFooter';
import { FlowHeader } from '../layout/FlowHeader';
import { ActionMenu } from '../ui/ActionMenu';
import { BottomSheet } from '../ui/BottomSheet';
import {
  HEADER_ICON_BUTTON_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from '../ui/buttonStyle';
import { FieldError } from '../ui/FieldError';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { MacroSummary } from '../ui/MacroSummary';
import { SearchPicker } from '../ui/SearchPicker';
import { useToast } from '../ui/toastContext';
import { createMeal, deleteMeal, updateMeal } from './api';
import {
  draftsToInput,
  draftTotals,
  mealToItems,
  newFoodDraft,
  type MealItemDraft,
} from './draft';
import { DraftItemList } from './DraftItemList';
import {
  EMPTY_QUICK_ADD_FORM,
  NUTRITION_FIELDS,
  validateQuickAddForm,
} from './quickMealAdd';
import type { Meal } from './types';

const LINK_CLASS =
  'cursor-pointer text-xs font-medium text-theme-500 underline-offset-2 hover:underline';

interface MealFormProps {
  /** The library meal edited, or null to create one. */
  meal: Meal | null;
  /** For a new meal, the one it starts as a copy of. */
  copyOf?: Meal | null;
  foodItems: FoodItem[];
  onClose: () => void;
  /** Opens a new meal filled from this one. */
  onCopy: () => void;
  /** Saved or deleted: the page can go. */
  onDone: () => void;
}

/**
 * Page content to create or edit a library meal: a name, foods searched in
 * the library with their quantity, and quick adds. Remount it (key) for
 * another meal.
 */
export function MealForm({
  meal,
  copyOf,
  foodItems,
  onClose,
  onCopy,
  onDone,
}: MealFormProps) {
  const source = meal ?? copyOf ?? null;
  const [name, setName] = useState(
    meal?.name ??
      (copyOf ? copyName(copyOf.name ?? '', MAX_LENGTH.mealName) : ''),
  );
  const [nameTouched, setNameTouched] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [items, setItems] = useState<MealItemDraft[]>(() =>
    source ? mealToItems(source, foodItems) : [],
  );
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const quickAdd = useFormValidation(
    EMPTY_QUICK_ADD_FORM,
    validateQuickAddForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showToast = useToast();

  useTimeout(() => setSubmitAttempted(false), submitAttempted ? 5000 : null);

  const trimmedName = name.trim();
  const nameError =
    trimmedName === ''
      ? 'Nom requis'
      : trimmedName.length > MAX_LENGTH.mealName
        ? maxLengthMessage(MAX_LENGTH.mealName)
        : undefined;
  const showNameError =
    nameTouched && (nameFocused || submitAttempted) ? nameError : undefined;
  const itemsError = items.length === 0 ? 'Minimum un aliment' : undefined;

  const replaceItem = (updated: MealItemDraft) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const addQuickItem = () => {
    if (!quickAdd.attemptSubmit()) {
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        kind: 'quick',
        quantity: 1,
        kcal: parseDecimal(quickAdd.form.kcal) ?? 0,
        protein: parseDecimal(quickAdd.form.protein) ?? 0,
        carbs: parseDecimal(quickAdd.form.carbs) ?? 0,
        fat: parseDecimal(quickAdd.form.fat) ?? 0,
      },
    ]);
    quickAdd.setForm(EMPTY_QUICK_ADD_FORM);
    quickAdd.resetValidation();
    setQuickAddOpen(false);
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNameTouched(true);

    if (nameError || itemsError) {
      setSubmitAttempted(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const input = { name, items: draftsToInput(items) };
      if (meal) {
        await updateMeal(meal.id, input);
      } else {
        await createMeal(input);
      }
      showToast(meal ? 'Repas modifié' : 'Repas enregistré');
      onDone();
    } catch (err: unknown) {
      setError(failureMessage(err, 'Une erreur est survenue, réessayez.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!meal) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteMeal(meal.id);
      showToast('Repas supprimé');
      onDone();
    } catch {
      setError('Suppression impossible, réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FlowHeader
        title={meal ? 'Modifier le repas' : 'Nouveau repas'}
        subtitle={meal?.name ?? 'Repas de bibliothèque'}
        onClose={onClose}
        action={
          meal && (
            <ActionMenu
              title={meal.name ?? 'Repas'}
              actions={[
                { label: 'Dupliquer le repas', icon: Copy, onSelect: onCopy },
              ]}
              onDelete={() => void handleDelete()}
              deleteLabel="Supprimer le repas"
              buttonClassName={HEADER_ICON_BUTTON_CLASS}
            />
          )
        }
      />
      <form
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
        autoComplete="off"
        className="contents"
      >
        <div className="relative flex flex-col gap-1.5">
          <label htmlFor="meal-name" className={LABEL_CLASS}>
            Nom
          </label>
          <Input
            id="meal-name"
            type="text"
            placeholder="Ex : Poulet riz"
            maxLength={MAX_LENGTH.mealName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setNameFocused(true)}
            onBlur={() => {
              setNameFocused(false);
              setNameTouched(true);
            }}
            data-invalid={nameTouched && Boolean(nameError)}
            autoComplete="off"
          />
          <FieldError message={showNameError} />
        </div>

        <SearchPicker
          label="Ajouter un aliment"
          placeholder="Rechercher un aliment"
          items={foodItems.filter((food) => !food.archived)}
          keyOf={(food) => food.id}
          nameOf={(food) => food.name}
          detailOf={(food) => `${food.kcal} kcal`}
          matches={matchesFood}
          isAdded={(food) =>
            items.some(
              (item) => item.kind === 'food' && item.foodItem.id === food.id,
            )
          }
          onPick={(food) => setItems((prev) => [...prev, newFoodDraft(food)])}
          labelAction={
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className={LINK_CLASS}
            >
              Ajout rapide
            </button>
          }
          renderEmpty={(_, close) => (
            <button
              type="button"
              onClick={() => {
                close();
                setQuickAddOpen(true);
              }}
              className={`${SECONDARY_BUTTON_CLASS} flex-none`}
            >
              <Zap className="h-4 w-4" />
              Ajout rapide
            </button>
          )}
          error={submitAttempted ? itemsError : undefined}
        />

        {items.length > 0 && (
          <DraftItemList
            items={items}
            onChange={replaceItem}
            onRemove={(id) =>
              setItems((prev) => prev.filter((item) => item.id !== id))
            }
          />
        )}

        <FlowFooter>
          {items.length > 0 && <MacroSummary totals={draftTotals(items)} />}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer le repas'}
          </button>
        </FlowFooter>
      </form>

      <BottomSheet
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        title="Ajout rapide"
      >
        <div className="grid grid-cols-2 gap-3 pt-1">
          {NUTRITION_FIELDS.map(({ field, label }) => (
            <div key={field} className="relative flex flex-col gap-1.5">
              <label htmlFor={`quick-${field}`} className={LABEL_CLASS}>
                {label}
              </label>
              <Input
                id={`quick-${field}`}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={quickAdd.form[field]}
                onChange={(e) => quickAdd.handleChange(field, e.target.value)}
                onFocus={() => quickAdd.handleFocus(field)}
                onBlur={() => quickAdd.handleBlur(field)}
                data-invalid={quickAdd.isInvalid(field)}
                autoComplete="off"
              />
              <FieldError message={quickAdd.errorMessage(field)} />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addQuickItem}
          className={`${PRIMARY_BUTTON_CLASS} mt-3`}
        >
          Ajouter au repas
        </button>
      </BottomSheet>
    </>
  );
}
