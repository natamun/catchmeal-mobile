import { useState } from 'react';

import { toDateKey } from '../../utils/dateKey';
import { failureMessage } from '../../utils/failureMessage';
import { FlowFooter } from '../layout/FlowFooter';
import { createMeal, deleteMeal, updateMeal } from '../meal/api';
import { draftsToInput, draftTotals, type MealItemDraft } from '../meal/draft';
import { DraftItemList } from '../meal/DraftItemList';
import type { Meal, MealType } from '../meal/types';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { MacroSummary } from '../ui/MacroSummary';

interface Props {
  mealType: MealType;
  date: Date;
  initialItems: MealItemDraft[];
  existingMeals?: Meal[];
  onSaved: () => void;
}

/**
 * The quantities of a journal section to check, then save: it adds a new
 * meal, or saves the whole section when it already has meals. Remount it
 * (key) to start again from `initialItems`.
 */
export function DailyMealReview({
  mealType,
  date,
  initialItems,
  existingMeals = [],
  onSaved,
}: Props) {
  const [items, setItems] = useState<MealItemDraft[]>(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = existingMeals.length > 0;

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const replaceItem = (updated: MealItemDraft) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const handleSubmit = async () => {
    if (items.length === 0 && !isEdit) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (!isEdit) {
        await createMeal({
          typeMeal: mealType,
          loggedAt: toDateKey(date),
          items: draftsToInput(items),
        });
      } else if (items.length === 0) {
        await Promise.all(existingMeals.map((meal) => deleteMeal(meal.id)));
      } else {
        // A section may hold several meals: the first one receives every item
        // and the others are deleted.
        const [first, ...others] = existingMeals;
        await updateMeal(first.id, { items: draftsToInput(items) });
        await Promise.all(others.map((meal) => deleteMeal(meal.id)));
      }
      onSaved();
    } catch (err: unknown) {
      setError(failureMessage(err, 'Une erreur est survenue, réessayez.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = draftTotals(items);

  return (
    <div className="flex flex-1 flex-col gap-5">
      {items.length > 0 ? (
        <DraftItemList
          items={items}
          onChange={replaceItem}
          onRemove={removeItem}
        />
      ) : (
        <p className="py-4 text-center text-sm text-theme-400">
          {isEdit
            ? 'Plus aucun aliment : enregistrer videra cette section.'
            : 'Aucun élément à ajouter.'}
        </p>
      )}

      <FlowFooter>
        {items.length > 0 && <MacroSummary totals={totals} />}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || (!isEdit && items.length === 0)}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting
            ? 'Enregistrement...'
            : isEdit
              ? 'Enregistrer le repas'
              : 'Ajouter au journal'}
        </button>
      </FlowFooter>
    </div>
  );
}
