import { useState, type ReactNode } from 'react';

import { MACROS } from '../../constants/macros';
import { Card, CardEmpty, CardLoading } from '../ui/Card';
import { LoadError } from '../ui/LoadError';
import { MacroBadge } from '../ui/MacroBadge';
import {
  EMPTY_FILTER_CRITERIA,
  matchesMacro,
  type FilterCriteria,
} from '../ui/macroFilter';
import { MacroSearchBar } from '../ui/MacroSearchBar';
import { matchesSearch } from '../ui/search';
import { mealTotals, type Meal } from './types';

interface MealListProps {
  meals: Meal[];
  isLoading: boolean;
  loadError: string | null;
  onRetry?: () => void;
  headerAction?: ReactNode;
  renderAction?: (meal: Meal) => ReactNode;
  /** Makes each row a button that opens the meal. */
  onOpen?: (meal: Meal) => void;
}

/** Calories and macro badges of a meal, from its items. */
function macrosOf(meal: Meal) {
  const totals = mealTotals(meal);

  return {
    kcal: Math.round(totals.kcal),
    macros: MACROS.map(({ key, label, color }) => ({
      label,
      color,
      value: Math.round(totals[key] * 10) / 10,
    })),
  };
}

/**
 * The library meals, with the same search, filters and rows as the food list:
 * a row opens the meal with `onOpen`, or carries the button `renderAction`
 * gives (select).
 */
export function MealList({
  meals,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  renderAction,
  onOpen,
}: MealListProps) {
  const [criteria, setCriteria] = useState<FilterCriteria>(
    EMPTY_FILTER_CRITERIA,
  );

  const visibleMeals = meals
    .filter((meal) => {
      const matchesQuery = matchesSearch([meal.name], criteria.query);
      const totals = mealTotals(meal);

      return (
        matchesQuery &&
        matchesMacro(totals.kcal, criteria.kcal) &&
        matchesMacro(totals.protein, criteria.protein) &&
        matchesMacro(totals.carbs, criteria.carbs) &&
        matchesMacro(totals.fat, criteria.fat)
      );
    })
    .sort((a, b) => {
      const { field, direction } = criteria.sort;
      const dir = direction === 'asc' ? 1 : -1;
      // Neither list knows how often its items are logged: by name then.
      return field === 'name' || field === 'frequency'
        ? (a.name ?? '').localeCompare(b.name ?? '') * dir
        : (mealTotals(a)[field] - mealTotals(b)[field]) * dir;
    });

  return (
    <Card
      flush
      className="@container"
      header={
        <>
          <MacroSearchBar
            items={meals.map(mealTotals)}
            criteria={criteria}
            onFilterChange={setCriteria}
          />
          {headerAction}
        </>
      }
    >
      {isLoading && <CardLoading />}

      {loadError && <LoadError message={loadError} onRetry={onRetry} />}

      {!isLoading && !loadError && meals.length === 0 && (
        <CardEmpty>Aucun repas enregistré.</CardEmpty>
      )}

      {!isLoading &&
        !loadError &&
        meals.length > 0 &&
        visibleMeals.length === 0 && (
          <CardEmpty>Aucun repas ne correspond à cette recherche.</CardEmpty>
        )}

      <ul className="divide-y divide-theme-200">
        {visibleMeals.map((meal) => {
          const { kcal, macros } = macrosOf(meal);
          const content = (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-theme-800">
                {meal.name ?? 'Repas sans nom'}
              </span>
              <span className="hidden shrink-0 items-center gap-2.5 @lg:flex">
                {macros.map((m) => (
                  <MacroBadge key={m.label} {...m} />
                ))}
              </span>
              <span className="shrink-0 text-right text-sm font-semibold whitespace-nowrap text-theme-800 tabular-nums">
                {kcal} kcal
              </span>
            </>
          );
          return (
            <li key={meal.id} className="even:bg-theme-50/60">
              {onOpen ? (
                <button
                  type="button"
                  onClick={() => onOpen(meal)}
                  className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition-colors active:bg-theme-100"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-5 py-4">
                  {content}
                  {renderAction?.(meal)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
