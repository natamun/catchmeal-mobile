import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { MACROS } from '../../constants/macros';
import { useToggleSet } from '../../hooks/useToggleSet';
import { Card, CardEmpty, CardLoading } from '../ui/Card';
import { LoadError } from '../ui/LoadError';
import { MacroBadge } from '../ui/MacroBadge';
import {
  EMPTY_FILTER_CRITERIA,
  matchesMacro,
  type FilterCriteria,
} from '../ui/macroFilter';
import { MacroSearchBar } from '../ui/MacroSearchBar';
import { mealTotals, type Meal } from './types';

interface MealListProps {
  meals: Meal[];
  isLoading: boolean;
  loadError: string | null;
  onRetry?: () => void;
  headerAction?: ReactNode;
  renderAction?: (meal: Meal) => ReactNode;
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
 * The library meals, with the same search, filters and expandable rows as the
 * food list.
 */
export function MealList({
  meals,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  renderAction,
}: MealListProps) {
  const [expandedIds, toggleExpanded] = useToggleSet<number>();
  const [criteria, setCriteria] = useState<FilterCriteria>(
    EMPTY_FILTER_CRITERIA,
  );

  const query = criteria.query.trim().toLowerCase();
  const visibleMeals = meals
    .filter((meal) => {
      const matchesQuery =
        !query || (meal.name ?? '').toLowerCase().includes(query);
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
      return field === 'name'
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
          const isExpanded = expandedIds.has(meal.id);
          const { kcal, macros } = macrosOf(meal);
          return (
            <li key={meal.id} className="px-5 py-4 even:bg-theme-50/60">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleExpanded(meal.id)}
                  className="shrink-0 cursor-pointer text-theme-400 transition-colors hover:text-theme-600 @lg:hidden"
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-theme-800">
                  {meal.name ?? 'Repas sans nom'}
                </p>
                <div className="hidden shrink-0 items-center gap-2.5 @lg:flex">
                  {macros.map((m) => (
                    <MacroBadge key={m.label} {...m} />
                  ))}
                </div>
                <span className="shrink-0 text-right text-sm font-semibold whitespace-nowrap text-theme-800 tabular-nums">
                  {kcal} kcal
                </span>
                {renderAction?.(meal)}
              </div>
              <div
                className={`grid pl-7 transition-[grid-template-rows] duration-200 ease-out @lg:hidden ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div
                  className={`flex flex-wrap items-center gap-1.5 overflow-hidden ${isExpanded ? 'pt-2' : ''}`}
                >
                  {macros.map((m) => (
                    <MacroBadge key={m.label} {...m} />
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
