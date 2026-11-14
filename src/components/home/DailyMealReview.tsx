import { useState } from 'react';

import { toDateKey } from '../../utils/dateKey';
import { failureMessage } from '../../utils/failureMessage';
import { FlowFooter } from '../layout/FlowFooter';
import { createMeal } from '../meal/api';
import { draftsToInput, draftTotals, type MealItemDraft } from '../meal/draft';
import { DraftItemList } from '../meal/DraftItemList';
import type { MealType } from '../meal/types';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { MacroSummary } from '../ui/MacroSummary';

interface Props {
  mealType: MealType;
  date: Date;
  initialItems: MealItemDraft[];
  onSaved: () => void;
}

/**
 * The quantities of what was picked for a journal section, to check, then
 * add as a new meal. Remount it (key) to start again from `initialItems`.
 */
export function DailyMealReview({
  mealType,
  date,
  initialItems,
  onSaved,
}: Props) {
  const [items, setItems] = useState<MealItemDraft[]>(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const replaceItem = (updated: MealItemDraft) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createMeal({
        typeMeal: mealType,
        loggedAt: toDateKey(date),
        items: draftsToInput(items),
      });
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
          Aucun élément à ajouter.
        </p>
      )}

      <FlowFooter>
        {items.length > 0 && <MacroSummary totals={totals} />}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || items.length === 0}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? 'Enregistrement...' : 'Ajouter au journal'}
        </button>
      </FlowFooter>
    </div>
  );
}
