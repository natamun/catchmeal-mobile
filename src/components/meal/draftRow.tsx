import { SlidersHorizontal } from 'lucide-react';

import { MACROS } from '../../constants/macros';
import { roundDecimals } from '../../utils/decimals';
import { DEFAULT_PORTION_NAME, pluralOf, portionLabel } from '../food/portion';
import { UNIT_LABELS } from '../food/types';
import { servingsLabel } from '../recipe/servings';
import { SECONDARY_BUTTON_CLASS } from '../ui/buttonStyle';
import type { EditableRow } from '../ui/EditableList';
import { MacroBadge } from '../ui/MacroBadge';
import { QuantityStepper } from '../ui/QuantityStepper';
import {
  adjustDraft,
  draftTotals,
  setDraftQuantity,
  showInPortions,
  type MealItemDraft,
} from './draft';
import { UnitToggle } from './UnitToggle';

/** The name of a recipe line, which says when it is a leftover or adapted. */
function recipeName(item: Extract<MealItemDraft, { kind: 'recipe' }>) {
  if (item.batch) return `${item.recipe.name} · préparé`;
  if (item.adapted) return `${item.recipe.name} (adaptée)`;
  return item.recipe.name;
}

/**
 * The row of one item: its quantity, its calories and its controls. With
 * `onAdapt`, a recipe not taken from a leftover can be cooked differently
 * this time.
 */
export function draftRow(
  item: MealItemDraft,
  onChange: (item: MealItemDraft) => void,
  onRemove: (id: string) => void,
  showKcal: boolean,
  onAdapt?: (item: MealItemDraft) => void,
): EditableRow {
  const totals = draftTotals([item]);
  const kcal = `${Math.round(totals.kcal)} kcal`;
  const base = {
    id: item.id,
    meta: showKcal ? kcal : undefined,
    detail: showKcal ? (
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-base font-bold text-theme-800 tabular-nums">
          {kcal}
        </span>
        {MACROS.map(({ key, label, color }) => (
          <MacroBadge
            key={key}
            label={label}
            color={color}
            size="md"
            value={Math.round(totals[key] * 10) / 10}
          />
        ))}
      </div>
    ) : undefined,
    onRemove: () => onRemove(item.id),
  };

  if (item.kind === 'quick') {
    return { ...base, name: 'Ajout rapide', value: '' };
  }

  if (item.kind === 'recipe') {
    const value = servingsLabel(item.quantity);
    const stepper = (
      <QuantityStepper
        text={value}
        onAdjust={(delta) => onChange(adjustDraft(item, delta))}
        typing={{
          value: item.quantity,
          unit: 'portions',
          onType: (typed) => onChange(setDraftQuantity(item, typed)),
        }}
      />
    );
    return {
      ...base,
      name: recipeName(item),
      value,
      editor:
        onAdapt && !item.batch ? (
          <div className="flex flex-col gap-3">
            {stepper}
            <button
              type="button"
              onClick={() => onAdapt(item)}
              className={SECONDARY_BUTTON_CLASS}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {item.adapted ? "Changer l'adaptation" : 'Adapter cette fois'}
            </button>
          </div>
        ) : (
          stepper
        ),
    };
  }

  const { foodItem, quantity, inPortions } = item;
  const unit = UNIT_LABELS[foodItem.baseUnit];
  const amount = `${roundDecimals(quantity, 1)}${unit}`;
  const portion = foodItem.portionQuantity;
  const portionName = foodItem.portionName ?? DEFAULT_PORTION_NAME;
  const byPortion = inPortions && portion !== null;
  const value = byPortion ? portionLabel(foodItem, quantity / portion) : amount;
  return {
    ...base,
    name: foodItem.name,
    value,
    aside:
      portion === null ? undefined : (
        <UnitToggle
          unit={unit}
          portion={portionName}
          inPortions={inPortions}
          onChange={(next) => onChange(showInPortions(item, next))}
        />
      ),
    editor: (
      <QuantityStepper
        text={value}
        detail={inPortions ? amount : undefined}
        onAdjust={(delta) => onChange(adjustDraft(item, delta))}
        typing={{
          value: byPortion ? quantity / portion : quantity,
          unit: byPortion ? pluralOf(portionName) : unit,
          onType: (typed) => onChange(setDraftQuantity(item, typed)),
        }}
      />
    ),
  };
}
