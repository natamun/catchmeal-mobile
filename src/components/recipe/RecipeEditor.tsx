import { useRef, useState, type RefObject } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

import { FoodItemForm } from '../food/FoodItemForm';
import type { FoodItem } from '../food/types';
import { newFoodDraft, type MealItemDraft } from '../meal/draft';
import { DraftItemList } from '../meal/DraftItemList';
import {
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from '../ui/buttonStyle';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DropdownPanel } from '../ui/DropdownPanel';
import { FieldError } from '../ui/FieldError';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { MacroSummary } from '../ui/MacroSummary';
import { SelectDropdown } from '../ui/SelectDropdown';
import { formPerServing, moveStep, newStep, RECIPE_LIMITS } from './recipeForm';
import { ServingsStepper } from './RecipeView';
import {
  RECIPE_CATEGORIES,
  RECIPE_CATEGORY_LABELS,
  type RecipeCategory,
} from './types';
import type { RecipeEditor } from './useRecipeEditor';

const TEXTAREA_CLASS =
  'w-full resize-none rounded-xl border border-theme-200 bg-surface px-4 py-2.5 text-base text-theme-800 outline-none field-sizing-content focus:border-theme-400';

const ICON_BUTTON_CLASS =
  'tap-area relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-theme-400 transition-colors hover:bg-theme-50 hover:text-theme-600 disabled:cursor-not-allowed disabled:opacity-30';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Aucune' },
  ...RECIPE_CATEGORIES.map((value) => ({
    value,
    label: RECIPE_CATEGORY_LABELS[value],
  })),
];

interface PartProps {
  editor: RecipeEditor;
}

interface FloatingPartProps extends PartProps {
  /** The dialog or page the dropdowns render in. */
  container: HTMLElement | null;
}

/** Name, category, servings and preparation time. */
export function InfoFields({ editor, container }: FloatingPartProps) {
  const { form, update, errors } = editor;
  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex flex-col gap-1.5">
        <label htmlFor="recipe-name" className={LABEL_CLASS}>
          Nom
        </label>
        <Input
          id="recipe-name"
          type="text"
          placeholder="Ex : Curry de poulet"
          maxLength={RECIPE_LIMITS.name}
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          data-invalid={Boolean(errors.name)}
          autoComplete="off"
        />
        <FieldError message={errors.name} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="recipe-category" className={LABEL_CLASS}>
            Catégorie
          </label>
          <SelectDropdown
            id="recipe-category"
            value={form.category ?? ''}
            options={CATEGORY_OPTIONS}
            onChange={(value) =>
              update({ category: (value || null) as RecipeCategory | null })
            }
            container={container}
          />
        </div>
        <div className="relative flex flex-col gap-1.5">
          <label htmlFor="recipe-prep" className={LABEL_CLASS}>
            Préparation (min)
          </label>
          <Input
            id="recipe-prep"
            type="text"
            inputMode="numeric"
            placeholder="Ex : 20"
            value={form.prepMinutes}
            onChange={(e) => update({ prepMinutes: e.target.value })}
            data-invalid={Boolean(errors.prepMinutes)}
            autoComplete="off"
          />
          <FieldError message={errors.prepMinutes} align="right" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className={LABEL_CLASS}>Portions</span>
        <ServingsStepper
          value={form.servings}
          onChange={(servings) => update({ servings })}
        />
      </div>
    </div>
  );
}

/**
 * The ingredients: foods searched in the library with their quantity, or a
 * new food added on the way (barcode scan included).
 */
export function IngredientsEditor({ editor, container }: FloatingPartProps) {
  const { form, update, errors, foodItems } = editor;
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const foodDialogRef = useRef<HTMLDialogElement>(null);

  const query = search.trim().toLowerCase();
  const results = query
    ? foodItems.filter(
        (food) =>
          !food.archived &&
          !form.ingredients.some(
            (item) => item.kind === 'food' && item.foodItem.id === food.id,
          ) &&
          (food.name.toLowerCase().includes(query) ||
            food.brand?.toLowerCase().includes(query)),
      )
    : [];

  const add = (food: FoodItem) => {
    update({ ingredients: [...form.ingredients, newFoodDraft(food)] });
    setSearch('');
  };

  const replace = (updated: MealItemDraft) =>
    update({
      ingredients: form.ingredients.map((item) =>
        item.id === updated.id ? updated : item,
      ),
    });

  return (
    <div className="flex flex-col gap-4">
      <Popover.Root
        open={searchFocused && results.length > 0}
        onOpenChange={() => {}}
      >
        <Popover.Anchor className="relative flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="recipe-ingredient-search" className={LABEL_CLASS}>
              Ajouter un aliment
            </label>
            <button
              type="button"
              onClick={() => foodDialogRef.current?.showModal()}
              className="cursor-pointer text-xs font-medium text-theme-500 underline-offset-2 hover:underline"
            >
              Nouvel aliment
            </button>
          </div>
          <Input
            id="recipe-ingredient-search"
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            data-invalid={Boolean(errors.ingredients)}
            autoComplete="off"
          />
          <FieldError message={errors.ingredients} />
        </Popover.Anchor>
        <DropdownPanel container={container} matchAnchorWidth>
          {results.map((food) => (
            <button
              key={food.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(food)}
              className="flex w-full cursor-pointer items-center justify-between border-t border-theme-100 px-4 py-2 text-left text-sm text-theme-800 transition-colors first:border-t-0 hover:bg-theme-50"
            >
              <span className="min-w-0 flex-1 truncate">{food.name}</span>
              <span className="shrink-0 text-xs text-theme-500">
                {food.kcal} kcal
              </span>
            </button>
          ))}
        </DropdownPanel>
      </Popover.Root>

      {form.ingredients.length > 0 && (
        <DraftItemList
          items={form.ingredients}
          onChange={replace}
          onRemove={(id) =>
            update({
              ingredients: form.ingredients.filter((item) => item.id !== id),
            })
          }
        />
      )}

      <FoodItemForm
        dialogRef={foodDialogRef}
        editingItem={null}
        foodItems={foodItems}
        onCreated={add}
      />
    </div>
  );
}

interface TextPartProps extends PartProps {
  hideLabel?: boolean;
}

/** How it cooks, written freely. */
export function CookingField({ editor, hideLabel }: TextPartProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {!hideLabel && (
        <label htmlFor="recipe-cooking" className={LABEL_CLASS}>
          Cuisson
        </label>
      )}
      <textarea
        id="recipe-cooking"
        rows={2}
        maxLength={RECIPE_LIMITS.cooking}
        placeholder="Ex : 25 min au four à 180 °C"
        value={editor.form.cooking}
        onChange={(e) => editor.update({ cooking: e.target.value })}
        className={TEXTAREA_CLASS}
      />
    </div>
  );
}

/** Anything else: replacements, storage... */
export function NotesField({ editor, hideLabel }: TextPartProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {!hideLabel && (
        <label htmlFor="recipe-notes" className={LABEL_CLASS}>
          Autres
        </label>
      )}
      <textarea
        id="recipe-notes"
        rows={3}
        maxLength={RECIPE_LIMITS.notes}
        placeholder="Ex : la dinde remplace le poulet, se garde 3 jours au frais"
        value={editor.form.notes}
        onChange={(e) => editor.update({ notes: e.target.value })}
        className={TEXTAREA_CLASS}
      />
    </div>
  );
}

/** The steps, numbered, each one moved up or down or removed. */
export function StepsEditor({ editor }: PartProps) {
  const { form, update, errors } = editor;
  const { steps } = form;

  const setText = (id: string, text: string) =>
    update({
      steps: steps.map((step) => (step.id === id ? { ...step, text } : step)),
    });

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-start gap-2">
            <span className="mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-theme-100 text-xs font-bold text-theme-600">
              {index + 1}
            </span>
            <textarea
              aria-label={`Étape ${index + 1}`}
              rows={2}
              maxLength={RECIPE_LIMITS.step}
              placeholder="Ex : Couper le poulet en dés."
              value={step.text}
              onChange={(e) => setText(step.id, e.target.value)}
              className={TEXTAREA_CLASS}
            />
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => update({ steps: moveStep(steps, index, -1) })}
                className={ICON_BUTTON_CLASS}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  update({ steps: steps.filter(({ id }) => id !== step.id) })
                }
                className={`${ICON_BUTTON_CLASS} hover:text-red-500`}
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={index === steps.length - 1}
                onClick={() => update({ steps: moveStep(steps, index, 1) })}
                className={ICON_BUTTON_CLASS}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {errors.steps && <p className="text-sm text-red-500">{errors.steps}</p>}
      <button
        type="button"
        onClick={() => update({ steps: [...steps, newStep()] })}
        className={`${SECONDARY_BUTTON_CLASS} self-start`}
      >
        <Plus className="h-4 w-4" />
        Ajouter une étape
      </button>
    </div>
  );
}

interface SaveBarProps extends PartProps {
  onSave: () => void;
}

/** Calories and macros of a serving, the error if any, and the save button. */
export function SaveBar({ editor, onSave }: SaveBarProps) {
  const { form, error, isSubmitting } = editor;
  return (
    <div className="flex flex-col gap-3">
      {form.ingredients.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-theme-500">Par portion</span>
          <MacroSummary totals={formPerServing(form)} />
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="button"
        onClick={onSave}
        disabled={isSubmitting}
        className={PRIMARY_BUTTON_CLASS}
      >
        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  );
}

interface DeleteDialogProps extends PartProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
}

/** Asks before deleting the recipe edited. */
export function DeleteRecipeDialog({ editor, dialogRef }: DeleteDialogProps) {
  return (
    <ConfirmDialog
      dialogRef={dialogRef}
      title="Supprimer cette recette ?"
      description={`${editor.recipe?.name ?? 'Cette recette'} sera retirée de votre liste. Les repas déjà loggés la gardent.`}
      confirmLabel="Supprimer"
      pendingLabel="Suppression..."
      isPending={editor.isSubmitting}
      onConfirm={() =>
        void editor.remove().finally(() => dialogRef.current?.close())
      }
    />
  );
}
