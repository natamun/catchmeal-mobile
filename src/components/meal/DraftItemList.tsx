import { X } from 'lucide-react';

import { UNIT_LABELS } from '../food/types';
import { QuantityStepper } from '../ui/QuantityStepper';
import type { MealItemDraft } from './draft';

const ROW_CLASS =
  'flex animate-fade-in-up rounded-xl border border-theme-200 px-3 py-2.5';

const NAME_CLASS =
  'min-w-0 flex-1 truncate text-base font-medium text-theme-800';

const REMOVE_CLASS =
  'tap-area relative shrink-0 cursor-pointer text-theme-400 transition-colors hover:text-red-500';

interface DraftItemListProps {
  items: MealItemDraft[];
  onAdjust: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  className?: string;
}

/**
 * Items of a meal being edited: a food with its quantity buttons on a line
 * of their own, or a quick add with its calories. Each one can be removed.
 */
export function DraftItemList({
  items,
  onAdjust,
  onRemove,
  className = '',
}: DraftItemListProps) {
  return (
    <ul className={`flex flex-col gap-2 ${className}`}>
      {items.map((item) => {
        if (item.kind === 'quick') {
          return (
            <li
              key={item.id}
              className={`${ROW_CLASS} min-h-12 items-center gap-3`}
            >
              <span className={NAME_CLASS}>{Math.round(item.kcal)} kcal</span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className={REMOVE_CLASS}
              >
                <X className="h-5 w-5" />
              </button>
            </li>
          );
        }

        const { foodItem, quantity } = item;
        return (
          <li key={item.id} className={`${ROW_CLASS} flex-col gap-2`}>
            <div className="flex items-center gap-3">
              <span className={NAME_CLASS}>{foodItem.name}</span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className={REMOVE_CLASS}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <QuantityStepper
              quantity={quantity}
              unitLabel={UNIT_LABELS[foodItem.baseUnit]}
              onAdjust={(delta) => onAdjust(item.id, delta)}
            />
          </li>
        );
      })}
    </ul>
  );
}
