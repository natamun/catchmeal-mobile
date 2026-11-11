import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { MACROS } from '../../constants/macros';
import { useToggleSet } from '../../hooks/useToggleSet';
import { roundDecimals } from '../../utils/decimals';
import { Card, CardEmpty, CardLoading } from '../ui/Card';
import { LoadError } from '../ui/LoadError';
import { MacroBadge } from '../ui/MacroBadge';
import {
  EMPTY_FILTER_CRITERIA,
  matchesMacro,
  type FilterCriteria,
} from '../ui/macroFilter';
import { MacroSearchBar } from '../ui/MacroSearchBar';
import { UNIT_LABELS, type FoodItem } from './types';

interface FoodItemListProps {
  items: FoodItem[];
  isLoading: boolean;
  loadError: string | null;
  onRetry?: () => void;
  headerAction?: ReactNode;
  renderAction?: (item: FoodItem) => ReactNode;
}

/** Base quantity with its unit, e.g. "100g" or "1x". */
function formatBaseQuantity(item: FoodItem) {
  return `${roundDecimals(item.baseQuantity, 1)}${UNIT_LABELS[item.baseUnit]}`;
}

/** Macro badges of a food, rounded to one decimal. */
function macrosOf(item: FoodItem) {
  return MACROS.map(({ key, label, color }) => ({
    label,
    color,
    value: roundDecimals(item[key], 1),
  }));
}

/**
 * The food library: search and filters, one row per food with its calories, and
 * the macro badges, which fold into an expandable row on narrow screens.
 * Archived foods are hidden. `renderAction` adds a button to each row (edit or
 * select).
 */
export function FoodItemList({
  items,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  renderAction,
}: FoodItemListProps) {
  const [expandedIds, toggleExpanded] = useToggleSet<number>();
  const [criteria, setCriteria] = useState<FilterCriteria>(
    EMPTY_FILTER_CRITERIA,
  );

  const activeItems = items.filter((item) => !item.archived);

  const query = criteria.query.trim().toLowerCase();
  const visibleItems = activeItems
    .filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query);

      return (
        matchesQuery &&
        matchesMacro(item.kcal, criteria.kcal) &&
        matchesMacro(item.protein, criteria.protein) &&
        matchesMacro(item.carbs, criteria.carbs) &&
        matchesMacro(item.fat, criteria.fat)
      );
    })
    .sort((a, b) => {
      const { field, direction } = criteria.sort;
      const dir = direction === 'asc' ? 1 : -1;
      return field === 'name'
        ? a.name.localeCompare(b.name) * dir
        : (a[field] - b[field]) * dir;
    });

  return (
    <Card
      flush
      className="@container"
      header={
        <>
          <MacroSearchBar
            items={activeItems}
            criteria={criteria}
            onFilterChange={setCriteria}
          />
          {headerAction}
        </>
      }
    >
      {isLoading && <CardLoading />}

      {loadError && <LoadError message={loadError} onRetry={onRetry} />}

      {!isLoading && !loadError && activeItems.length === 0 && (
        <CardEmpty>Aucun aliment enregistré.</CardEmpty>
      )}

      {!isLoading &&
        !loadError &&
        activeItems.length > 0 &&
        visibleItems.length === 0 && (
          <CardEmpty>Aucun aliment ne correspond à cette recherche.</CardEmpty>
        )}

      <ul className="divide-y divide-theme-200">
        {visibleItems.map((item) => {
          const isExpanded = expandedIds.has(item.id);
          const macros = macrosOf(item);
          return (
            <li key={item.id} className="px-5 py-4 even:bg-theme-50/60">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleExpanded(item.id)}
                  className="tap-area relative shrink-0 cursor-pointer text-theme-400 transition-colors hover:text-theme-600 @lg:hidden"
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-theme-800">
                    {item.name}
                  </p>
                  <p className="truncate text-xs text-theme-500">
                    {item.brand && `${item.brand} · `}
                    {formatBaseQuantity(item)}
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-2.5 @lg:flex">
                  {macros.map((m) => (
                    <MacroBadge key={m.label} {...m} />
                  ))}
                </div>
                <span className="shrink-0 text-right text-sm font-semibold whitespace-nowrap text-theme-800 tabular-nums">
                  {Math.round(item.kcal)} kcal
                </span>
                {renderAction?.(item)}
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
