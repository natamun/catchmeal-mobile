import { useState } from 'react';

import { failureMessage } from '../../utils/failureMessage';
import { FlowFooter } from '../layout/FlowFooter';
import type { MealItemDraft } from '../meal/draft';
import { DraftItemList } from '../meal/DraftItemList';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { addFoodsToShopping } from './api';
import { draftsToShopping } from './lines';

interface ShoppingReviewProps {
  initialItems: MealItemDraft[];
  onAdded: () => void;
}

/**
 * The quantities to buy, checked before adding them to the list: a food as
 * picked, a recipe for its servings.
 */
export function ShoppingReview({ initialItems, onAdded }: ShoppingReviewProps) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lines = draftsToShopping(items);

  const add = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await addFoodsToShopping(lines);
      onAdded();
    } catch (err: unknown) {
      setError(failureMessage(err, 'Une erreur est survenue, réessayez.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      {items.length > 0 ? (
        <DraftItemList
          items={items}
          showKcal={false}
          onChange={(updated) =>
            setItems((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item)),
            )
          }
          onRemove={(id) =>
            setItems((prev) => prev.filter((item) => item.id !== id))
          }
        />
      ) : (
        <p className="py-4 text-center text-sm text-theme-400">
          Aucun élément à ajouter.
        </p>
      )}

      <FlowFooter>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="button"
          onClick={() => void add()}
          disabled={isSubmitting || lines.length === 0}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? 'Ajout...' : 'Ajouter aux courses'}
        </button>
      </FlowFooter>
    </div>
  );
}
