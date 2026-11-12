import { useMemo, useState, type ReactNode } from 'react';

import type { FoodUsage } from '../../data/foodItems';
import { roundDecimals } from '../../utils/decimals';
import { Card, CardEmpty, CardLoading } from '../ui/Card';
import { ListRow, ListRows } from '../ui/ListRow';
import { LoadError } from '../ui/LoadError';
import {
  BY_FREQUENCY,
  EMPTY_FILTER_CRITERIA,
  matchesMacro,
  type FilterCriteria,
} from '../ui/macroFilter';
import { MacroSearchBar } from '../ui/MacroSearchBar';
import { MacroTrail } from '../ui/MacroTrail';
import { matchesFood } from './search';
import { UNIT_LABELS, type FoodItem } from './types';

interface FoodItemListProps {
  items: FoodItem[];
  isLoading: boolean;
  loadError: string | null;
  onRetry?: () => void;
  headerAction?: ReactNode;
  renderAction?: (item: FoodItem) => ReactNode;
  /** How often the foods were logged: offers the sort by it, and starts there. */
  usage?: readonly FoodUsage[];
  /** Makes each row a button that opens the food. */
  onOpen?: (item: FoodItem) => void;
}

/** Base quantity with its unit, e.g. "100g" or "1x". */
function formatBaseQuantity(item: FoodItem) {
  return `${roundDecimals(item.baseQuantity, 1)}${UNIT_LABELS[item.baseUnit]}`;
}

const byName = (a: FoodItem, b: FoodItem) =>
  a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });

/**
 * The food library: search and filters, one row per food with its calories,
 * and its macro badges on a wide screen. Archived foods are hidden. A row opens
 * the food with `onOpen`, or carries the button `renderAction` gives (select).
 * With `usage` the list starts with the foods most logged in the last 90 days,
 * then the most logged ever, then by name.
 */
export function FoodItemList({
  items,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  renderAction,
  usage,
  onOpen,
}: FoodItemListProps) {
  const [criteria, setCriteria] = useState<FilterCriteria>(() =>
    usage
      ? { ...EMPTY_FILTER_CRITERIA, sort: BY_FREQUENCY }
      : EMPTY_FILTER_CRITERIA,
  );
  const usageById = useMemo(
    () => new Map(usage?.map((u) => [u.foodItemId, u])),
    [usage],
  );

  const activeItems = items.filter((item) => !item.archived);

  const visibleItems = activeItems
    .filter((item) => {
      return (
        matchesFood(item, criteria.query) &&
        matchesMacro(item.kcal, criteria.kcal) &&
        matchesMacro(item.protein, criteria.protein) &&
        matchesMacro(item.carbs, criteria.carbs) &&
        matchesMacro(item.fat, criteria.fat)
      );
    })
    .sort((a, b) => {
      const { field, direction } = criteria.sort;
      const dir = direction === 'asc' ? 1 : -1;
      if (field === 'frequency') {
        const ua = usageById.get(a.id);
        const ub = usageById.get(b.id);
        return (
          (ub?.last90Days ?? 0) - (ua?.last90Days ?? 0) ||
          (ub?.count ?? 0) - (ua?.count ?? 0) ||
          byName(a, b)
        );
      }
      return field === 'name'
        ? byName(a, b) * dir
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
            canSortByFrequency={usage !== undefined}
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

      <ListRows>
        {visibleItems.map((item) => (
          <ListRow
            key={item.id}
            title={item.name}
            subtitle={`${item.brand ? `${item.brand} · ` : ''}${formatBaseQuantity(item)}`}
            trailing={<MacroTrail values={item} />}
            onClick={onOpen && (() => onOpen(item))}
            action={renderAction?.(item)}
          />
        ))}
      </ListRows>
    </Card>
  );
}
