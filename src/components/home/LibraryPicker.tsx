import { useEffect, useState, type ReactNode } from 'react';

import { useToggleSet } from '../../hooks/useToggleSet';
import { listFoodItems } from '../food/api';
import { FoodItemList } from '../food/FoodItemList';
import type { FoodItem } from '../food/types';
import { FlowHeader } from '../layout/FlowHeader';
import { listMeals } from '../meal/api';
import { buildDrafts, type MealItemDraft } from '../meal/draft';
import { MealList } from '../meal/MealList';
import type { Meal } from '../meal/types';
import { listRecipes } from '../recipe/api';
import { RecipeList } from '../recipe/RecipeList';
import type { Recipe } from '../recipe/types';
import { PillTabs } from '../ui/PillTabs';
import { SelectToggle } from '../ui/SelectToggle';
import { SelectionBar } from './SelectionBar';

type PickerTab = 'food' | 'meal' | 'recipe';

const TAB_OPTIONS: { value: PickerTab; label: string }[] = [
  { value: 'food', label: 'Aliments' },
  { value: 'meal', label: 'Repas' },
  { value: 'recipe', label: 'Recettes' },
];

interface LibraryPickerProps {
  title: string;
  subtitle: string;
  onClose: () => void;
  /** Changes the drafts picked before the second step, if needed. */
  prepare?: (items: MealItemDraft[]) => MealItemDraft[];
  /** The second step, from the drafts picked: the quantities, then saving. */
  renderReview: (items: MealItemDraft[]) => ReactNode;
}

/**
 * Page content that picks foods, library meals and recipes in two steps:
 * select them in three tabs, then the second step, such as checking the
 * quantities before saving.
 */
export function LibraryPicker({
  title,
  subtitle,
  onClose,
  prepare = (items) => items,
  renderReview,
}: LibraryPickerProps) {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [templates, setTemplates] = useState<Meal[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<PickerTab>('food');
  const [selectedFoodIds, toggleFood] = useToggleSet<number>();
  const [selectedMealIds, toggleMeal] = useToggleSet<number>();
  const [selectedRecipeIds, toggleRecipe] = useToggleSet<number>();
  const [review, setReview] = useState<{
    key: number;
    items: MealItemDraft[];
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listFoodItems(controller.signal),
      listMeals(false, controller.signal),
      listRecipes(controller.signal),
    ])
      .then(([foods, meals, library]) => {
        setFoodItems(foods);
        setTemplates(meals);
        setRecipes(library);
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError('Impossible de charger la bibliothèque. Réessayez.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  const selectedCount =
    selectedFoodIds.size + selectedMealIds.size + selectedRecipeIds.size;

  const openReview = () => {
    const items = buildDrafts(
      {
        foods: foodItems.filter((food) => selectedFoodIds.has(food.id)),
        recipes: recipes.filter((recipe) => selectedRecipeIds.has(recipe.id)),
        meals: templates.filter((meal) => selectedMealIds.has(meal.id)),
      },
      { foodItems, recipes },
    );
    setReview((prev) => ({ key: (prev?.key ?? 0) + 1, items: prepare(items) }));
  };

  const header = (
    <FlowHeader
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      onBack={review ? () => setReview(null) : undefined}
    />
  );

  if (review) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {header}
        <div key={review.key} className="flex flex-1 animate-step-in flex-col">
          {renderReview(review.items)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      <PillTabs
        name="mealPickerTab"
        options={TAB_OPTIONS}
        value={tab}
        onChange={setTab}
        className="self-start"
      />

      <div key={tab} className="animate-fade-in-up">
        {tab === 'food' ? (
          <FoodItemList
            items={foodItems}
            isLoading={isLoading}
            loadError={loadError}
            renderAction={(food) => (
              <SelectToggle
                selected={selectedFoodIds.has(food.id)}
                onToggle={() => toggleFood(food.id)}
              />
            )}
          />
        ) : tab === 'meal' ? (
          <MealList
            meals={templates}
            isLoading={isLoading}
            loadError={loadError}
            renderAction={(meal) => (
              <SelectToggle
                selected={selectedMealIds.has(meal.id)}
                onToggle={() => toggleMeal(meal.id)}
              />
            )}
          />
        ) : (
          <RecipeList
            recipes={recipes}
            isLoading={isLoading}
            loadError={loadError}
            renderAction={(recipe) => (
              <SelectToggle
                selected={selectedRecipeIds.has(recipe.id)}
                onToggle={() => toggleRecipe(recipe.id)}
              />
            )}
          />
        )}
      </div>

      <SelectionBar count={selectedCount} onNext={openReview} />
    </div>
  );
}
