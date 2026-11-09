import { useState } from 'react';

import { failureMessage } from '../../utils/failureMessage';
import type { FoodItem } from '../food/types';
import { useToast } from '../ui/toastContext';
import { createRecipe, deleteRecipe, updateRecipe } from './api';
import {
  copyToForm,
  emptyRecipeForm,
  formToInput,
  recipeToForm,
  validateRecipeForm,
  type RecipeForm,
} from './recipeForm';
import type { Recipe } from './types';

interface EditorOptions {
  /** The recipe edited, null for a new one. */
  recipe: Recipe | null;
  /** For a new recipe, the one it starts as a copy of. */
  copyOf?: Recipe | null;
  /** The whole library, loaded: the form is filled from it once. */
  foodItems: FoodItem[];
  onSaved: (recipe: Recipe) => void;
  onDeleted?: () => void;
}

/**
 * The state of a recipe being written: its fields, the errors shown after a
 * first try, saving and deleting. Mount it once the foods are loaded, and
 * again (key) for another recipe.
 */
export function useRecipeEditor({
  recipe,
  copyOf,
  foodItems,
  onSaved,
  onDeleted,
}: EditorOptions) {
  const [form, setForm] = useState<RecipeForm>(() => {
    if (recipe) return recipeToForm(recipe, foodItems);
    return copyOf ? copyToForm(copyOf, foodItems) : emptyRecipeForm();
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showToast = useToast();

  const errors = validateRecipeForm(form);
  const shown = submitAttempted ? errors : {};

  const update = (changes: Partial<RecipeForm>) =>
    setForm((current) => ({ ...current, ...changes }));

  const save = async () => {
    setError(null);
    if (Object.keys(errors).length > 0) {
      setSubmitAttempted(true);
      return false;
    }
    setIsSubmitting(true);
    try {
      const input = formToInput(form);
      const saved = recipe
        ? await updateRecipe(recipe.id, input)
        : await createRecipe(input);
      showToast(recipe ? 'Recette modifiée' : 'Recette enregistrée');
      onSaved(saved);
      return true;
    } catch (err: unknown) {
      setError(failureMessage(err, 'Une erreur est survenue, réessayez.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async () => {
    if (!recipe) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteRecipe(recipe.id);
      showToast('Recette supprimée');
      onDeleted?.();
    } catch {
      setError('Suppression impossible, réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    recipe,
    foodItems,
    form,
    update,
    errors: shown,
    error,
    isSubmitting,
    save,
    remove,
  };
}

export type RecipeEditor = ReturnType<typeof useRecipeEditor>;
