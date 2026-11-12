import { useState, type ReactNode } from 'react';

import { Card, CardEmpty, CardLoading } from '../ui/Card';
import { ListRow, ListRows } from '../ui/ListRow';
import { LoadError } from '../ui/LoadError';
import {
  EMPTY_FILTER_CRITERIA,
  matchesMacro,
  type FilterCriteria,
} from '../ui/macroFilter';
import { MacroSearchBar } from '../ui/MacroSearchBar';
import { MacroTrail } from '../ui/MacroTrail';
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

      <ListRows>
        {visibleMeals.map((meal) => (
          <ListRow
            key={meal.id}
            title={meal.name ?? 'Repas sans nom'}
            trailing={<MacroTrail values={mealTotals(meal)} />}
            onClick={onOpen && (() => onOpen(meal))}
            action={renderAction?.(meal)}
          />
        ))}
      </ListRows>
    </Card>
  );
}
