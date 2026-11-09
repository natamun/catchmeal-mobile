import type { ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';

import type { FoodItem } from '../food/types';
import { MacroSummary } from '../ui/MacroSummary';
import {
  amountText,
  MAX_SERVINGS,
  perServing,
  scaledQuantity,
  servingsLabel,
} from './servings';
import type { Recipe } from './types';

const STEP_BUTTON_CLASS =
  'tap-area relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-theme-50 text-theme-600 transition-colors hover:bg-theme-100 disabled:cursor-not-allowed disabled:opacity-40';

/** Title of a part of a recipe: Ingrédients, Cuisson, Préparation... */
const SECTION_TITLE_CLASS = 'text-base font-semibold text-theme-500';

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
    <div className="flex items-center gap-2 select-none">
      {prefix && <span className="text-sm text-theme-500">{prefix}</span>}
      <button
        type="button"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className={STEP_BUTTON_CLASS}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-22 text-center text-sm font-semibold text-theme-800 tabular-nums">
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

interface RecipeCardProps {
  title?: string;
  /** Next to the title, such as the servings stepper. */
  action?: ReactNode;
  children: ReactNode;
}

/** White card holding one part of a recipe, with its title. */
export function RecipeCard({ title, action, children }: RecipeCardProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-theme-200 bg-surface p-5 shadow-sm">
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title && <h3 className={SECTION_TITLE_CLASS}>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Calories and macros of one serving, under a small title. */
export function ServingNutrition({ recipe }: { recipe: Recipe }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-theme-500">Par portion</span>
      <MacroSummary totals={perServing(recipe)} />
    </div>
  );
}

interface IngredientRowsProps {
  recipe: Recipe;
  foodItems: FoodItem[];
  /** The servings to show the quantities for. */
  servings: number;
}

/** The ingredients with their quantities for the servings chosen. */
export function IngredientRows({
  recipe,
  foodItems,
  servings,
}: IngredientRowsProps) {
  return (
    <ul className="divide-y divide-theme-100">
      {recipe.ingredients.map((item) => {
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
                  scaledQuantity(item.quantity, recipe.servings, servings),
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The steps of the preparation, numbered. */
export function StepRows({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-theme-100 text-xs font-bold text-theme-600">
            {index + 1}
          </span>
          <p className="min-w-0 flex-1 text-sm whitespace-pre-line text-theme-800">
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
    <p className="text-sm whitespace-pre-line text-theme-800">{children}</p>
  );
}

/** What a part of a recipe left empty says. */
export function EmptyPart({ children }: { children: string }) {
  return <p className="text-sm text-theme-400">{children}</p>;
}
