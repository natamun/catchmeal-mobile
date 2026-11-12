import { useState } from 'react';

import type { FoodItem } from '../food/types';
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPES,
  type Meal,
  type MealType,
} from '../meal/types';
import type { Recipe } from '../recipe/types';
import { Card } from '../ui/Card';
import { LoadError } from '../ui/LoadError';
import { DaySection } from './DaySection';

interface JournalRow {
  key: string;
  label: string;
  kcal: number;
}

/**
 * Rows of a section: the same food or recipe logged in several meals becomes
 * one row with its calories added up; each quick add keeps its own row.
 */
function rowsOf(
  sectionMeals: Meal[],
  foodItems: FoodItem[],
  recipes: Recipe[],
): JournalRow[] {
  const rows: JournalRow[] = [];
  const rowByFoodId = new Map<number, JournalRow>();
  const rowByRecipeId = new Map<number, JournalRow>();

  for (const meal of sectionMeals) {
    for (const item of meal.items) {
      if (item.recipeId !== null) {
        const existing = rowByRecipeId.get(item.recipeId);
        if (existing) {
          existing.kcal += item.kcal;
          continue;
        }
        const row: JournalRow = {
          key: `recipe-${item.recipeId}`,
          label:
            recipes.find((recipe) => recipe.id === item.recipeId)?.name ??
            'Recette inconnue',
          kcal: item.kcal,
        };
        rowByRecipeId.set(item.recipeId, row);
        rows.push(row);
        continue;
      }

      if (item.foodItemId === null) {
        rows.push({
          key: `${meal.id}-${item.id}`,
          label: 'Ajout rapide',
          kcal: item.kcal,
        });
        continue;
      }

      const existing = rowByFoodId.get(item.foodItemId);
      if (existing) {
        existing.kcal += item.kcal;
        continue;
      }

      const row: JournalRow = {
        key: `food-${item.foodItemId}`,
        label:
          foodItems.find((food) => food.id === item.foodItemId)?.name ??
          'Aliment inconnu',
        kcal: item.kcal,
      };
      rowByFoodId.set(item.foodItemId, row);
      rows.push(row);
    }
  }

  return rows;
}

interface DailyMealListProps {
  meals: Meal[];
  foodItems: FoodItem[];
  recipes: Recipe[];
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onAdd: (mealType: MealType) => void;
  onEdit: (mealType: MealType) => void;
}

/**
 * The four sections of the journal (breakfast, lunch, dinner, snack) with their
 * foods and calories, an add button and, when not empty, an edit button.
 */
export function DailyMealList({
  meals,
  foodItems,
  recipes,
  isLoading,
  loadError,
  onRetry,
  onAdd,
  onEdit,
}: DailyMealListProps) {
  // While another day loads, the edit buttons follow the meals last shown, so
  // they don't flicker.
  const [loadedMeals, setLoadedMeals] = useState(meals);

  if (!isLoading && loadedMeals !== meals) {
    setLoadedMeals(meals);
  }

  const editableMeals = isLoading ? loadedMeals : meals;

  return (
    <Card flush>
      {loadError && <LoadError message={loadError} onRetry={onRetry} />}

      <div className={`divide-y divide-theme-200 ${loadError ? 'hidden' : ''}`}>
        {MEAL_TYPES.map((mealType) => {
          const rows = rowsOf(
            meals
              .filter((meal) => meal.typeMeal === mealType)
              .sort((a, b) => a.id - b.id),
            foodItems,
            recipes,
          );
          const total = rows.reduce((sum, row) => sum + row.kcal, 0);
          const canEdit = editableMeals.some(
            (meal) => meal.typeMeal === mealType && meal.items.length > 0,
          );

          return (
            <div key={mealType}>
              <DaySection
                title={MEAL_TYPE_LABELS[mealType]}
                onAdd={() => onAdd(mealType)}
                onEdit={
                  canEdit
                    ? () => {
                        if (!isLoading) onEdit(mealType);
                      }
                    : undefined
                }
                kcal={total}
                isLoading={isLoading}
                rows={rows.map((row) => (
                  <li key={row.key} className="flex items-center gap-3 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-theme-800">
                      {row.label}
                    </span>
                    <span className="shrink-0 text-sm text-theme-600">
                      {Math.round(row.kcal)} kcal
                    </span>
                  </li>
                ))}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
