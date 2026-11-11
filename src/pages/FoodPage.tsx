import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { listFoodItems } from '../components/food/api';
import { FoodItemForm } from '../components/food/FoodItemForm';
import { FoodItemList } from '../components/food/FoodItemList';
import { preloadScanner } from '../components/food/preloadScanner';
import type { FoodItem } from '../components/food/types';
import { listMeals } from '../components/meal/api';
import { MealList } from '../components/meal/MealList';
import { listRecipes } from '../components/recipe/api';
import { RecipeList } from '../components/recipe/RecipeList';
import { ShoppingTab } from '../components/shopping/ShoppingTab';
import { AddCircleButton } from '../components/ui/AddCircleButton';
import { EditIconButton } from '../components/ui/EditIconButton';
import { PillTabs } from '../components/ui/PillTabs';
import { useList } from '../hooks/useList';
import { mealPath, recipePath } from '../routing/recipes';

type Tab = 'food' | 'meal' | 'recipe' | 'shopping';

/** The library meals, the journal left out. */
const listLibraryMeals = (signal: AbortSignal) => listMeals(false, signal);

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'food', label: 'Aliments' },
  { value: 'meal', label: 'Repas' },
  { value: 'recipe', label: 'Recettes' },
  { value: 'shopping', label: 'Courses' },
];

/**
 * Food page with four tabs: the food library, the library meals and the
 * recipes, each with its create and edit dialog or page, and the shopping
 * list.
 */
export default function FoodPage() {
  const [activeTab, setActiveTab] = useState<Tab>('food');
  const foods = useList(listFoodItems);
  const meals = useList(listLibraryMeals);
  const recipes = useList(listRecipes);
  const navigate = useNavigate();
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // The scanner is slow to open the first time: prepare it once the app is up.
  useEffect(() => {
    const timer = setTimeout(preloadScanner, 2000);
    return () => clearTimeout(timer);
  }, []);

  const openDialog = (item: FoodItem | null) => {
    setEditingItem(item);
    dialogRef.current?.showModal();
  };

  return (
    <div className="flex flex-col gap-6">
      <PillTabs
        name="foodPageTab"
        options={TAB_OPTIONS}
        value={activeTab}
        onChange={setActiveTab}
        fill
      />

      <FoodItemForm
        dialogRef={dialogRef}
        editingItem={editingItem}
        foodItems={foods.items}
      />

      <div key={activeTab} className="animate-fade-in-up">
        {activeTab === 'food' ? (
          <FoodItemList
            items={foods.items}
            isLoading={foods.isLoading}
            loadError={
              foods.hasError ? 'Impossible de charger les aliments.' : null
            }
            onRetry={foods.retry}
            headerAction={<AddCircleButton onClick={() => openDialog(null)} />}
            renderAction={(item) => (
              <EditIconButton onClick={() => openDialog(item)} />
            )}
          />
        ) : activeTab === 'shopping' ? (
          <ShoppingTab foodItems={foods.items} />
        ) : activeTab === 'recipe' ? (
          <RecipeList
            recipes={recipes.items}
            isLoading={recipes.isLoading}
            loadError={
              recipes.hasError ? 'Impossible de charger les recettes.' : null
            }
            onRetry={recipes.retry}
            headerAction={
              <AddCircleButton
                onClick={() => void navigate(recipePath('new'))}
              />
            }
            onOpen={(recipe) => void navigate(recipePath(recipe.id))}
          />
        ) : (
          <MealList
            meals={meals.items}
            isLoading={meals.isLoading}
            loadError={
              meals.hasError ? 'Impossible de charger les repas.' : null
            }
            onRetry={meals.retry}
            headerAction={
              <AddCircleButton onClick={() => void navigate(mealPath('new'))} />
            }
            renderAction={(meal) => (
              <EditIconButton
                onClick={() => void navigate(mealPath(meal.id))}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
