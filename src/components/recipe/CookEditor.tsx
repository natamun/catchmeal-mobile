import { useState, type ReactNode } from 'react';

import type { FoodItem } from '../food/types';
import { FlowFooter } from '../layout/FlowFooter';
import { draftTotals } from '../meal/draft';
import { PRIMARY_BUTTON_CLASS } from '../ui/buttonStyle';
import { Card } from '../ui/Card';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { MacroSummary } from '../ui/MacroSummary';
import { IngredientsEditor } from './RecipeEditor';
import {
  foodLines,
  formPerServing,
  formToInput,
  recipeToForm,
  validateRecipeForm,
  type RecipeForm,
} from './recipeForm';
import { ServingsStepper } from './RecipeView';
import type { CookInput, Nutrition, Recipe } from './types';

interface Props {
  recipe: Recipe;
  foodItems: FoodItem[];
  /** Where it starts, when not from the recipe as it is. */
  initial?: CookInput;
  submitLabel: string;
  isSubmitting?: boolean;
  error?: string | null;
  /** The servings and ingredients of this time, with the totals of it all. */
  onSubmit: (cook: CookInput, totals: Nutrition) => void;
  /** Beside the main button, such as a way back without changing anything. */
  secondary?: ReactNode;
}

/** The recipe as a form, filled from `initial` when given. */
function startForm(recipe: Recipe, foodItems: FoodItem[], initial?: CookInput) {
  if (!initial) return recipeToForm(recipe, foodItems);
  return recipeToForm(
    {
      ...recipe,
      servings: initial.servings,
      ingredients: initial.ingredients.map((item, index) => ({
        id: index,
        foodItemId: item.foodItemId,
        quantity: item.quantity,
        section: item.section ?? null,
      })),
    },
    foodItems,
  );
}

/**
 * A recipe cooked this time: its servings and ingredients, changed or not,
 * without touching the recipe itself. Used to cook ahead and to adapt a
 * recipe logged in the journal.
 */
export function CookEditor({
  recipe,
  foodItems,
  initial,
  submitLabel,
  isSubmitting = false,
  error = null,
  onSubmit,
  secondary,
}: Props) {
  const [form, setForm] = useState<RecipeForm>(() =>
    startForm(recipe, foodItems, initial),
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const { ingredients, sections } = validateRecipeForm(form);
  const errors = { ingredients, sections };
  const update = (changes: Partial<RecipeForm>) =>
    setForm((current) => ({ ...current, ...changes }));

  const submit = () => {
    if (ingredients || sections) {
      setSubmitAttempted(true);
      return;
    }
    const input = formToInput(form);
    onSubmit(
      { servings: input.servings, ingredients: input.ingredients },
      draftTotals(foodLines(form.ingredients)),
    );
  };

  return (
    <>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <span className={LABEL_CLASS}>Portions</span>
          <ServingsStepper
            value={form.servings}
            onChange={(servings) => update({ servings })}
          />
        </div>
      </Card>
      <Card title="Ingrédients">
        <IngredientsEditor
          editor={{
            form,
            update,
            errors: submitAttempted ? errors : {},
            foodItems,
          }}
        />
      </Card>
      <FlowFooter>
        {foodLines(form.ingredients).length > 0 && (
          <div className="flex flex-col">
            <span className="text-xs text-theme-600">Par portion</span>
            <MacroSummary totals={formPerServing(form)} />
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          {secondary}
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className={`${PRIMARY_BUTTON_CLASS} flex-1`}
          >
            {isSubmitting ? 'Enregistrement...' : submitLabel}
          </button>
        </div>
      </FlowFooter>
    </>
  );
}
