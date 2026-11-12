import type { RefObject } from 'react';
import { Pencil } from 'lucide-react';

import { MACROS } from '../../constants/macros';
import type { FoodUsage } from '../../data/foodItems';
import { startOfDay } from '../../utils/dateKey';
import { roundDecimals } from '../../utils/decimals';
import { formatShortDate } from '../../utils/format';
import { amountParts } from '../recipe/servings';
import { BaseDialog } from '../ui/BaseDialog';
import { SECONDARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { InfoBubble } from '../ui/InfoBubble';
import { StatTile } from '../ui/StatTile';
import { UNIT_LABELS, type FoodItem } from './types';

/** A value of the line of calories and macros: one line, like a tile. */
const VALUE_CLASS =
  'flex items-center justify-center gap-1.5 rounded-xl bg-theme-50 px-2 py-2 text-sm font-semibold whitespace-nowrap text-theme-800 tabular-nums';

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  food: FoodItem | null;
  /** Its journal use, undefined when it was never logged. */
  usage: FoodUsage | undefined;
  onEdit: (food: FoodItem) => void;
}

/**
 * The sheet of one food: its calories and macros for its base quantity, how
 * often it was logged and the latest log, and a way to edit it.
 */
export function FoodSheet({ dialogRef, food, usage, onEdit }: Props) {
  const base = food
    ? `${roundDecimals(food.baseQuantity, 1).toLocaleString('fr-FR')} ${UNIT_LABELS[food.baseUnit]}`
    : '';
  const last = food && usage ? amountParts(food, usage.lastQuantity) : null;
  const lastDay = usage
    ? `le ${formatShortDate(startOfDay(usage.lastDay))}`
    : '';
  return (
    <BaseDialog dialogRef={dialogRef} title={food?.name ?? ''}>
      {food && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1">
              <h4 className="text-xs font-semibold text-theme-500">
                Valeurs pour {base}
              </h4>
              <InfoBubble bubbleClassName="w-max">
                {MACROS.map(({ key, label, color }) => (
                  <p key={key} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${color}`} />
                    {label}
                  </p>
                ))}
                <p className="text-theme-600">En grammes.</p>
              </InfoBubble>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <span className={VALUE_CLASS}>{Math.round(food.kcal)} kcal</span>
              {MACROS.map(({ key, label, color }) => (
                <span key={key} className={VALUE_CLASS}>
                  <span
                    aria-label={label}
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`}
                  />
                  {roundDecimals(food[key], 1).toLocaleString('fr-FR')}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-theme-500">Journal</h4>
            {usage && last ? (
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="Loggé"
                  value={`${usage.count} fois`}
                  note={`dont ${usage.last30Days} en 30 j`}
                />
                <StatTile
                  label="Dernier log"
                  value={last.main}
                  note={last.weight ? `${last.weight}, ${lastDay}` : lastDay}
                />
              </div>
            ) : (
              <p className="text-sm text-theme-600">
                Pas encore loggé dans le journal.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onEdit(food)}
            className={SECONDARY_BUTTON_CLASS}
          >
            <Pencil className="h-4 w-4" />
            Modifier l&apos;aliment
          </button>
        </div>
      )}
    </BaseDialog>
  );
}
