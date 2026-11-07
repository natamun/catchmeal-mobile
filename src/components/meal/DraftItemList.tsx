import { X } from 'lucide-react';

import { roundDecimals } from '../../utils/decimals';
import { DEFAULT_PORTION_NAME, portionLabel } from '../food/portion';
import { UNIT_LABELS } from '../food/types';
import { QuantityStepper } from '../ui/QuantityStepper';
import { adjustDraft, showInPortions, type MealItemDraft } from './draft';

const ROW_CLASS =
  'flex animate-fade-in-up rounded-xl border border-theme-200 px-3 py-2.5';

const NAME_CLASS =
  'min-w-0 flex-1 truncate text-base font-medium text-theme-800';

const REMOVE_CLASS =
  'tap-area relative shrink-0 cursor-pointer text-theme-400 transition-colors hover:text-red-500';

const TOGGLE_CLASS =
  'tap-area relative max-w-24 cursor-pointer truncate rounded-md px-2.5 py-1 text-xs font-semibold transition-colors';

interface UnitToggleProps {
  unit: string;
  portion: string;
  inPortions: boolean;
  onChange: (inPortions: boolean) => void;
}

/** Counts a food in its base unit or in portions: "g | biscuit". */
function UnitToggle({ unit, portion, inPortions, onChange }: UnitToggleProps) {
  const option = (value: boolean, label: string) => (
    <button
      type="button"
      aria-pressed={inPortions === value}
      onClick={() => onChange(value)}
      className={`${TOGGLE_CLASS} ${
        inPortions === value
          ? 'bg-theme-500 text-on-accent'
          : 'text-theme-500 hover:bg-theme-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex shrink-0 gap-0.5 rounded-lg border border-theme-200 p-0.5">
      {option(false, unit)}
      {option(true, portion)}
    </div>
  );
}

interface DraftItemListProps {
  items: MealItemDraft[];
  /** Gives back an item with its quantity or its unit changed. */
  onChange: (item: MealItemDraft) => void;
  onRemove: (id: string) => void;
  className?: string;
}

/**
 * Items of a meal being edited: a food with its quantity buttons on a line
 * of their own, counted in portions when it has some, or a quick add with
 * its calories. Each one can be removed.
 */
export function DraftItemList({
  items,
  onChange,
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

        const { foodItem, quantity, inPortions } = item;
        const unit = UNIT_LABELS[foodItem.baseUnit];
        const amount = `${roundDecimals(quantity, 1)}${unit}`;
        const portion = foodItem.portionQuantity;
        return (
          <li key={item.id} className={`${ROW_CLASS} flex-col gap-2`}>
            <div className="flex items-center gap-3">
              <span className={NAME_CLASS}>{foodItem.name}</span>
              {portion !== null && (
                <UnitToggle
                  unit={unit}
                  portion={foodItem.portionName ?? DEFAULT_PORTION_NAME}
                  inPortions={inPortions}
                  onChange={(next) => onChange(showInPortions(item, next))}
                />
              )}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className={REMOVE_CLASS}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <QuantityStepper
              text={
                inPortions && portion !== null
                  ? portionLabel(foodItem, quantity / portion)
                  : amount
              }
              detail={inPortions ? amount : undefined}
              onAdjust={(delta) => onChange(adjustDraft(item, delta))}
            />
          </li>
        );
      })}
    </ul>
  );
}
