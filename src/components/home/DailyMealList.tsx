import { useState } from 'react';

import type { FoodItem } from '../food/types';
import { buildDrafts } from '../meal/draft';
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPES,
  mealTotals,
  type Meal,
  type MealFoodItem,
  type MealType,
} from '../meal/types';
import type { Recipe } from '../recipe/types';
import { INSET_ROW_CLASS } from '../ui/buttonStyle';
import { Card } from '../ui/Card';
import { LoadError } from '../ui/LoadError';
import { DaySection } from './DaySection';
import { JournalLineSheet, type JournalLine } from './JournalLineSheet';

interface JournalRow {
  key: string;
  label: string;
  kcal: number;
  /** The lines it gathers, in the order they were logged. */
  items: MealFoodItem[];
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
          existing.items.push(item);
          continue;
        }
        const row: JournalRow = {
          key: `recipe-${item.recipeId}`,
          items: [item],
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
          items: [item],
        });
        continue;
      }

      const existing = rowByFoodId.get(item.foodItemId);
      if (existing) {
        existing.kcal += item.kcal;
        existing.items.push(item);
        continue;
      }

      const row: JournalRow = {
        key: `food-${item.foodItemId}`,
        items: [item],
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
}

/**
 * The four sections of the journal (breakfast, lunch, dinner, snack) with
 * their totals, their foods and an add button. A tap on a food opens its
 * sheet, to change its quantity or remove it.
 */
export function DailyMealList({
  meals,
  foodItems,
  recipes,
  isLoading,
  loadError,
  onRetry,
  onAdd,
}: DailyMealListProps) {
  const [sheet, setSheet] = useState<{
    line: JournalLine | null;
    isOpen: boolean;
    openCount: number;
  }>({ line: null, isOpen: false, openCount: 0 });

  /** The row as one item to edit, or null when its food is not found. */
  const lineOf = (row: JournalRow, meal: Meal): JournalLine | null => {
    const [draft] = buildDrafts(
      { meals: [{ ...meal, items: row.items }] },
      { foodItems, recipes },
    );
    return draft ? { itemIds: row.items.map(({ id }) => id), draft } : null;
  };

  return (
    <Card flush>
      {loadError && <LoadError message={loadError} onRetry={onRetry} />}

      <div className={`divide-y divide-theme-200 ${loadError ? 'hidden' : ''}`}>
        {MEAL_TYPES.map((mealType) => {
          const sectionMeals = meals
            .filter((meal) => meal.typeMeal === mealType)
            .sort((a, b) => a.id - b.id);
          const rows = rowsOf(sectionMeals, foodItems, recipes);
          const totals = sectionMeals.map(mealTotals).reduce(
            (sum, meal) => ({
              kcal: sum.kcal + meal.kcal,
              protein: sum.protein + meal.protein,
              carbs: sum.carbs + meal.carbs,
              fat: sum.fat + meal.fat,
            }),
            { kcal: 0, protein: 0, carbs: 0, fat: 0 },
          );

          return (
            <div key={mealType}>
              <DaySection
                title={MEAL_TYPE_LABELS[mealType]}
                onAdd={() => onAdd(mealType)}
                totals={totals}
                isLoading={isLoading}
                rows={rows.map((row) => {
                  const line = isLoading ? null : lineOf(row, sectionMeals[0]);
                  return (
                    <li key={row.key}>
                      <button
                        type="button"
                        disabled={!line}
                        onClick={() =>
                          setSheet(({ openCount }) => ({
                            line,
                            isOpen: true,
                            openCount: openCount + 1,
                          }))
                        }
                        className={`${INSET_ROW_CLASS} h-9 items-center gap-3 disabled:cursor-default`}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-theme-800">
                          {row.label}
                        </span>
                        <span className="shrink-0 text-sm text-theme-600 tabular-nums">
                          {Math.round(row.kcal)} kcal
                        </span>
                      </button>
                    </li>
                  );
                })}
              />
            </div>
          );
        })}
      </div>

      <JournalLineSheet
        key={sheet.openCount}
        open={sheet.isOpen}
        onClose={() => setSheet((current) => ({ ...current, isOpen: false }))}
        line={sheet.line}
      />
    </Card>
  );
}
