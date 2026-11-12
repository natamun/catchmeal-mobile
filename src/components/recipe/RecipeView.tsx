import { Minus, Plus } from 'lucide-react';

import type { FoodItem } from '../food/types';
import { STEP_BUTTON_CLASS } from '../ui/buttonStyle';
import { Card } from '../ui/Card';
import { KcalPill, MacroBadges } from '../ui/MacroSummary';
import {
  amountText,
  MAX_SERVINGS,
  perServing,
  scaledQuantity,
  servingsLabel,
} from './servings';
import type { Recipe } from './types';

interface ServingsStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** A word before it, such as "Pour". */
  prefix?: string;
}

/** Minus and plus around a number of servings, from 1 to 50. */
export function ServingsStepper({
  value,
  onChange,
  prefix,
}: ServingsStepperProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 select-none">
      {prefix && <span className="text-sm text-theme-600">{prefix}</span>}
      <button
        type="button"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className={STEP_BUTTON_CLASS}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-19 text-center text-sm font-semibold whitespace-nowrap text-theme-800 tabular-nums">
        {servingsLabel(value)}
      </span>
      <button
        type="button"
        disabled={value >= MAX_SERVINGS}
        onClick={() => onChange(value + 1)}
        className={STEP_BUTTON_CLASS}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Calories and macros of one serving, as a card of its own. */
export function ServingNutrition({ recipe }: { recipe: Recipe }) {
  const totals = perServing(recipe);
  return (
    <Card title="Par portion" action={<KcalPill kcal={totals.kcal} />}>
      <MacroBadges totals={totals} />
    </Card>
  );
}

interface IngredientRowsProps {
  recipe: Recipe;
  foodItems: FoodItem[];
  /** The servings to show the quantities for. */
  servings: number;
}

/**
 * The ingredients with their quantities for the servings chosen, those of a
 * section under its name.
 */
export function IngredientRows({
  recipe,
  foodItems,
  servings,
}: IngredientRowsProps) {
  // Runs of ingredients that share a section, in the order of the recipe.
  const groups: {
    key: number;
    section: string | null;
    items: Recipe['ingredients'];
  }[] = [];
  for (const item of recipe.ingredients) {
    const last = groups.at(-1);
    if (last && last.section === item.section) last.items.push(item);
    else groups.push({ key: item.id, section: item.section, items: [item] });
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ key, section, items }) => (
        <div key={key} className="flex flex-col">
          {section !== null && (
            <h3 className="pt-1 text-sm font-semibold text-theme-500">
              {section}
            </h3>
          )}
          <ul className="divide-y divide-theme-100">
            {items.map((item) => {
              const food = foodItems.find(({ id }) => id === item.foodItemId);
              return (
                <li key={item.id} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 text-sm font-medium text-theme-800">
                    {food?.name ?? 'Aliment inconnu'}
                  </span>
                  {food && (
                    <span className="shrink-0 text-sm text-theme-600 tabular-nums">
                      {amountText(
                        food,
                        scaledQuantity(
                          item.quantity,
                          recipe.servings,
                          servings,
                        ),
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** The steps of the preparation, numbered. */
export function StepRows({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-theme-100 text-xs font-bold text-theme-600">
            {index + 1}
          </span>
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-pretty whitespace-pre-line text-theme-800">
            {step}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Free text written by the user, its line breaks kept. */
export function TextBlock({ children }: { children: string }) {
  return (
    <p className="text-sm leading-relaxed text-pretty whitespace-pre-line text-theme-800">
      {children}
    </p>
  );
}

/** What a part of a recipe left empty says. */
export function EmptyPart({ children }: { children: string }) {
  return <p className="text-sm text-theme-400">{children}</p>;
}
