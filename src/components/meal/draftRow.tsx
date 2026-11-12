import { MACROS } from '../../constants/macros';
import { roundDecimals } from '../../utils/decimals';
import { DEFAULT_PORTION_NAME, pluralOf, portionLabel } from '../food/portion';
import { UNIT_LABELS } from '../food/types';
import { servingsLabel } from '../recipe/servings';
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

/** The row of one item: its quantity, its calories and its controls. */
export function draftRow(
  item: MealItemDraft,
  onChange: (item: MealItemDraft) => void,
  onRemove: (id: string) => void,
  showKcal: boolean,
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
    return {
      ...base,
      name: item.recipe.name,
      value,
      editor: (
        <QuantityStepper
          text={value}
          onAdjust={(delta) => onChange(adjustDraft(item, delta))}
          typing={{
            value: item.quantity,
            unit: 'portions',
            onType: (typed) => onChange(setDraftQuantity(item, typed)),
          }}
        />
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
