import { useEffect, useState } from 'react';

import { useToggleSet } from '../../hooks/useToggleSet';
import { formatWeekday } from '../../utils/format';
import { listFoodItems } from '../food/api';
import { FoodItemList } from '../food/FoodItemList';
import type { FoodItem } from '../food/types';
import { FlowHeader } from '../layout/FlowHeader';
import { listMeals } from '../meal/api';
import { buildDrafts, type MealItemDraft } from '../meal/draft';
import { MealList } from '../meal/MealList';
import { MEAL_TYPE_LABELS, type Meal, type MealType } from '../meal/types';
import { PillTabs } from '../ui/PillTabs';
import { SelectToggle } from '../ui/SelectToggle';
import { DailyMealReview } from './DailyMealReview';

type PickerTab = 'food' | 'meal';

const TAB_OPTIONS: { value: PickerTab; label: string }[] = [
  { value: 'food', label: 'Aliments' },
  { value: 'meal', label: 'Repas' },
];

interface DailyMealPickerProps {
  mealType: MealType;
  date: Date;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * Page content that adds foods and library meals to one section of the
 * journal, in two steps: select them in two tabs, then check the quantities
 * before saving.
 */
export function DailyMealPicker({
  mealType,
  date,
  onClose,
  onAdded,
}: DailyMealPickerProps) {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [templates, setTemplates] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<PickerTab>('food');
  const [selectedFoodIds, toggleFood] = useToggleSet<number>();
  const [selectedMealIds, toggleMeal] = useToggleSet<number>();
  const [review, setReview] = useState<{
    key: number;
    items: MealItemDraft[];
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listFoodItems(controller.signal),
      listMeals(false, controller.signal),
    ])
      .then(([foods, meals]) => {
        setFoodItems(foods);
        setTemplates(meals);
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

  const selectedCount = selectedFoodIds.size + selectedMealIds.size;

  const openReview = () => {
    const items = buildDrafts(
      foodItems.filter((food) => selectedFoodIds.has(food.id)),
      templates.filter((meal) => selectedMealIds.has(meal.id)),
      foodItems,
    );
    setReview((prev) => ({ key: (prev?.key ?? 0) + 1, items }));
  };

  const header = (
    <FlowHeader
      title={MEAL_TYPE_LABELS[mealType]}
      subtitle={formatWeekday(date)}
      onClose={onClose}
      onBack={review ? () => setReview(null) : undefined}
    />
  );

  if (review) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div key={review.key} className="animate-step-in">
          <DailyMealReview
            mealType={mealType}
            date={date}
            initialItems={review.items}
            onSaved={onAdded}
          />
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
        ) : (
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
        )}
      </div>

      <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 mx-3 flex items-center justify-between gap-3 rounded-2xl border border-theme-200 bg-surface p-3 shadow-lg md:mx-auto md:w-full md:max-w-md">
        <span className="text-sm text-theme-600">
          {selectedCount === 0
            ? 'Aucune sélection'
            : `${selectedCount} sélectionné${selectedCount > 1 ? 's' : ''}`}
        </span>
        <button
          type="button"
          onClick={openReview}
          disabled={selectedCount === 0}
          className="cursor-pointer rounded-xl bg-theme-500 px-5 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-theme-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
