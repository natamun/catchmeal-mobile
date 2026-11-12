import { useRef, useState, type RefObject } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { Check, Plus, X } from 'lucide-react';

import { FoodItemForm } from '../food/FoodItemForm';
import { matchesFood } from '../food/search';
import type { FoodItem } from '../food/types';
import { FlowFooter } from '../layout/FlowFooter';
import { newFoodDraft } from '../meal/draft';
import { draftRow } from '../meal/draftRow';
import {
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from '../ui/buttonStyle';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EditableList, type EditableRow } from '../ui/EditableList';
import { FieldError } from '../ui/FieldError';
import { LABEL_CLASS } from '../ui/fieldStyle';
import { Input } from '../ui/Input';
import { MacroSummary } from '../ui/MacroSummary';
import { SearchPicker } from '../ui/SearchPicker';
import { SelectDropdown } from '../ui/SelectDropdown';
import { SortableList } from '../ui/SortableList';
import {
  foodLines,
  formPerServing,
  isEmptySection,
  isSection,
  newSection,
  newStep,
  RECIPE_LIMITS,
  type IngredientLine,
  type SectionDraft,
} from './recipeForm';
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
  'tap-area relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-theme-400 transition-colors hover:bg-theme-100 hover:text-theme-600 disabled:cursor-not-allowed disabled:opacity-30';

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

/** Name, category, servings and preparation time. */
export function InfoFields({ editor }: PartProps) {
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

const SECTION_INPUT_CLASS =
  'h-11 min-w-0 flex-1 rounded-none border-b border-transparent bg-transparent px-1 text-base font-semibold text-theme-500 outline-none placeholder:font-normal placeholder:text-theme-400 focus:border-theme-400 data-[invalid=true]:border-red-400';

interface SectionTitleProps {
  section: SectionDraft;
  invalid: boolean;
  autoFocus: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
}

/**
 * A section title among the ingredients, written as plain text in the
 * accent colour. While it is typed, a check (or the keyboard's enter key)
 * ends the typing; otherwise a cross removes the title, its foods joining
 * the section above.
 */
function SectionTitle({
  section,
  invalid,
  autoFocus,
  onRename,
  onRemove,
}: SectionTitleProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const label = section.name.trim() || 'la section';

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        aria-label="Nom de la section"
        placeholder="Nom de la section, ex : Sauce"
        maxLength={RECIPE_LIMITS.section}
        value={section.name}
        autoFocus={autoFocus}
        enterKeyHint="done"
        onChange={(e) => onRename(e.target.value)}
        onFocus={() => setIsTyping(true)}
        onBlur={() => setIsTyping(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') inputRef.current?.blur();
        }}
        data-invalid={invalid}
        autoComplete="off"
        className={SECTION_INPUT_CLASS}
      />
      {isTyping ? (
        <button
          type="button"
          aria-label="Valider le nom"
          // Keeps the focus in the field until the tap ends, so the cross
          // never takes the check's place under the finger.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.blur()}
          className={`${ICON_BUTTON_CLASS} shrink-0 text-theme-500`}
        >
          <Check className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Retirer ${label}`}
          onClick={onRemove}
          className={`${ICON_BUTTON_CLASS} shrink-0 hover:text-red-500`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * The ingredients: foods searched in the library with their quantity, or a
 * new food added on the way (barcode scan included), and section titles
 * such as "Sauce" for the foods below them. Each line is dragged by its
 * handle; a new food goes to the end, in the last section, and a food
 * already there can be added again for another section.
 */
export function IngredientsEditor({ editor }: PartProps) {
  const { form, update, errors, foodItems } = editor;
  const lines = form.ingredients;
  const foodDialogRef = useRef<HTMLDialogElement>(null);
  // The title just added gets the keyboard, to be named at once.
  const [addedSection, setAddedSection] = useState<string | null>(null);

  const add = (food: FoodItem) =>
    update({ ingredients: [...lines, newFoodDraft(food)] });

  const replace = (updated: IngredientLine) =>
    update({
      ingredients: lines.map((line) =>
        line.id === updated.id ? updated : line,
      ),
    });

  const remove = (id: string) =>
    update({ ingredients: lines.filter((line) => line.id !== id) });

  const addSection = () => {
    const section = newSection();
    setAddedSection(section.id);
    update({ ingredients: [...lines, section] });
  };

  const countOf = (food: FoodItem) =>
    lines.filter((line) => line.kind === 'food' && line.foodItem.id === food.id)
      .length;

  const rows = lines.map((line): EditableRow => {
    if (!isSection(line)) return draftRow(line, replace, remove, true);
    return {
      id: line.id,
      name: line.name.trim() || 'la section',
      value: '',
      onRemove: () => remove(line.id),
      custom: (
        <SectionTitle
          section={line}
          invalid={
            Boolean(errors.sections) &&
            (line.name.trim() === '' || isEmptySection(lines, line.id))
          }
          autoFocus={line.id === addedSection}
          onRename={(name) => replace({ ...line, name })}
          onRemove={() => remove(line.id)}
        />
      ),
    };
  });

  const newFoodButton = (
    <button
      type="button"
      onClick={() => foodDialogRef.current?.showModal()}
      className="cursor-pointer text-xs font-medium text-theme-500 underline-offset-2 hover:underline"
    >
      Nouvel aliment
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <SearchPicker
        label="Ajouter un aliment"
        placeholder="Rechercher un aliment"
        items={foodItems.filter((food) => !food.archived)}
        keyOf={(food) => food.id}
        nameOf={(food) => food.name}
        detailOf={(food) => `${food.kcal} kcal`}
        matches={matchesFood}
        isAdded={(food) => countOf(food) > 0}
        // The same food can go in two sections: oil for the chicken and
        // for the sauce.
        countOf={countOf}
        onPick={add}
        labelAction={newFoodButton}
        renderEmpty={() => (
          <button
            type="button"
            onClick={() => foodDialogRef.current?.showModal()}
            className={`${SECONDARY_BUTTON_CLASS} flex-none`}
          >
            <Plus className="h-4 w-4" />
            Nouvel aliment
          </button>
        )}
        error={errors.ingredients}
      />

      {lines.length > 0 && (
        <EditableList
          rows={rows}
          onMove={(from, to) =>
            update({ ingredients: arrayMove(lines, from, to) })
          }
        />
      )}
      {errors.sections && (
        <p className="text-sm text-red-500">{errors.sections}</p>
      )}
      <button
        type="button"
        onClick={addSection}
        className={SECONDARY_BUTTON_CLASS}
      >
        <Plus className="h-4 w-4" />
        Ajouter une section
      </button>

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

/** The steps, numbered, each one dragged by its handle or removed. */
export function StepsEditor({ editor }: PartProps) {
  const { form, update, errors } = editor;
  const { steps } = form;

  const setText = (id: string, text: string) =>
    update({
      steps: steps.map((step) => (step.id === id ? { ...step, text } : step)),
    });

  return (
    <div className="flex flex-col gap-3">
      <SortableList
        ordered
        items={steps}
        onMove={(from, to) => update({ steps: arrayMove(steps, from, to) })}
        labelOf={(_, index) => `l'étape ${index + 1}`}
        className="-ml-3 flex flex-col gap-3"
        itemClassName="flex items-start gap-1"
        renderItem={(step, index, handle) => (
          <>
            <div className="mt-1 flex shrink-0 items-center">
              {handle}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-theme-100 text-xs font-bold text-theme-600">
                {index + 1}
              </span>
            </div>
            <textarea
              aria-label={`Étape ${index + 1}`}
              rows={2}
              maxLength={RECIPE_LIMITS.step}
              placeholder="Ex : Couper le poulet en dés."
              value={step.text}
              onChange={(e) => setText(step.id, e.target.value)}
              className={`${TEXTAREA_CLASS} ml-1`}
            />
            <button
              type="button"
              aria-label={`Retirer l'étape ${index + 1}`}
              onClick={() =>
                update({ steps: steps.filter(({ id }) => id !== step.id) })
              }
              className={`${ICON_BUTTON_CLASS} mt-3 ml-1 shrink-0 hover:text-red-500`}
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      />
      {errors.steps && <p className="text-sm text-red-500">{errors.steps}</p>}
      <button
        type="button"
        onClick={() => update({ steps: [...steps, newStep()] })}
        className={SECONDARY_BUTTON_CLASS}
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
    <FlowFooter>
      {foodLines(form.ingredients).length > 0 && (
        <div className="flex flex-col">
          <span className="text-xs text-theme-600">Par portion</span>
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
        {isSubmitting ? 'Enregistrement...' : 'Enregistrer la recette'}
      </button>
    </FlowFooter>
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
