import { useEffect, useRef, useState } from 'react';

import { listFoodItems } from '../components/food/api';
import { FoodItemForm } from '../components/food/FoodItemForm';
import { FoodItemList } from '../components/food/FoodItemList';
import { preloadScanner } from '../components/food/preloadScanner';
import type { FoodItem } from '../components/food/types';
import { listMeals } from '../components/meal/api';
import { MealForm } from '../components/meal/MealForm';
import { MealList } from '../components/meal/MealList';
import type { Meal } from '../components/meal/types';
import { AddCircleButton } from '../components/ui/AddCircleButton';
import { EditIconButton } from '../components/ui/EditIconButton';
import { InfoBubble } from '../components/ui/InfoBubble';
import { PillTabs } from '../components/ui/PillTabs';
import { MACROS } from '../constants/macros';
import { useList } from '../hooks/useList';

type Tab = 'food' | 'meal';

/** The library meals, the journal left out. */
const listLibraryMeals = (signal: AbortSignal) => listMeals(false, signal);

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'food', label: 'Aliments' },
  { value: 'meal', label: 'Repas' },
];

/** Legend of the macro dots shown on every line. */
const MACRO_LEGEND = (
  <InfoBubble bubbleClassName="whitespace-nowrap">
    <div className="flex flex-col items-start gap-1.5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-3">
      <div className="flex items-center gap-3">
        {MACROS.map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>
      <span className="text-theme-400">Valeurs en grammes</span>
    </div>
  </InfoBubble>
);

/**
 * Food page with two tabs, the food library and the library meals, each with
 * its create and edit dialog.
 */
export default function FoodPage() {
  const [activeTab, setActiveTab] = useState<Tab>('food');
  const foods = useList(listFoodItems);
  const meals = useList(listLibraryMeals);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mealDialogRef = useRef<HTMLDialogElement>(null);

  // The scanner is slow to open the first time: prepare it once the app is up.
  useEffect(() => {
    const timer = setTimeout(preloadScanner, 2000);
    return () => clearTimeout(timer);
  }, []);

  const openDialog = (item: FoodItem | null) => {
    setEditingItem(item);
    dialogRef.current?.showModal();
  };

  const openMealDialog = (meal: Meal | null) => {
    setEditingMeal(meal);
    mealDialogRef.current?.showModal();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <PillTabs
          name="foodPageTab"
          options={TAB_OPTIONS}
          value={activeTab}
          onChange={setActiveTab}
        />
        {MACRO_LEGEND}
      </div>

      <FoodItemForm
        dialogRef={dialogRef}
        editingItem={editingItem}
        foodItems={foods.items}
      />

      <MealForm
        dialogRef={mealDialogRef}
        foodItems={foods.items}
        editingMeal={editingMeal}
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
        ) : (
          <MealList
            meals={meals.items}
            isLoading={meals.isLoading}
            loadError={
              meals.hasError ? 'Impossible de charger les repas.' : null
            }
            onRetry={meals.retry}
            headerAction={
              <AddCircleButton onClick={() => openMealDialog(null)} />
            }
            renderAction={(meal) => (
              <EditIconButton onClick={() => openMealDialog(meal)} />
            )}
          />
        )}
      </div>
    </div>
  );
}
