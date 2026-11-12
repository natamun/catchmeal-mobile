import { useState, type ReactNode } from 'react';

import { formatMinutes } from '../../utils/format';
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
import { perServing, servingsLabel } from './servings';
import {
  RECIPE_CATEGORIES,
  RECIPE_CATEGORY_LABELS,
  type Recipe,
} from './types';

interface RecipeListProps {
  recipes: Recipe[];
  isLoading: boolean;
  loadError: string | null;
  onRetry?: () => void;
  headerAction?: ReactNode;
  renderAction?: (recipe: Recipe) => ReactNode;
  /** Makes each row open its recipe. */
  onOpen?: (recipe: Recipe) => void;
}

/** What a row says under the name: "4 portions · 35 min". */
const detailsOf = ({ servings, prepMinutes }: Recipe) =>
  [servingsLabel(servings), prepMinutes && formatMinutes(prepMinutes)]
    .filter(Boolean)
    .join(' · ');

/**
 * The recipe library: search, sort and filters (category, macros), one row
 * per recipe with its servings and preparation time, and the calories and
 * macros of one serving. Archived recipes are hidden.
 */
export function RecipeList({
  recipes,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  renderAction,
  onOpen,
}: RecipeListProps) {
  const [criteria, setCriteria] = useState<FilterCriteria>(
    EMPTY_FILTER_CRITERIA,
  );

  const active = recipes.filter((recipe) => !recipe.archived);
  const categories = RECIPE_CATEGORIES.filter((value) =>
    active.some((recipe) => recipe.category === value),
  ).map((value) => ({ value, label: RECIPE_CATEGORY_LABELS[value] }));

  const visible = active
    .filter((recipe) => {
      const serving = perServing(recipe);
      return (
        matchesSearch(recipe.name, criteria.query) &&
        (criteria.category === null || recipe.category === criteria.category) &&
        matchesMacro(serving.kcal, criteria.kcal) &&
        matchesMacro(serving.protein, criteria.protein) &&
        matchesMacro(serving.carbs, criteria.carbs) &&
        matchesMacro(serving.fat, criteria.fat)
      );
    })
    .sort((a, b) => {
      const { field, direction } = criteria.sort;
      const dir = direction === 'asc' ? 1 : -1;
      // Neither list knows how often its items are logged: by name then.
      return field === 'name' || field === 'frequency'
        ? a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }) * dir
        : (perServing(a)[field] - perServing(b)[field]) * dir;
    });

  return (
    <Card
      flush
      className="@container"
      header={
        <>
          <MacroSearchBar
            items={active.map(perServing)}
            criteria={criteria}
            onFilterChange={setCriteria}
            categories={categories}
            note="Valeurs par portion, en grammes"
          />
          {headerAction}
        </>
      }
    >
      {isLoading && <CardLoading />}

      {loadError && <LoadError message={loadError} onRetry={onRetry} />}

      {!isLoading && !loadError && active.length === 0 && (
        <CardEmpty>Aucune recette enregistrée.</CardEmpty>
      )}

      {!isLoading &&
        !loadError &&
        active.length > 0 &&
        visible.length === 0 && (
          <CardEmpty>Aucune recette ne correspond à cette recherche.</CardEmpty>
        )}

      <ListRows>
        {visible.map((recipe) => (
          <ListRow
            key={recipe.id}
            title={recipe.name}
            subtitle={detailsOf(recipe)}
            trailing={<MacroTrail values={perServing(recipe)} />}
            onClick={onOpen && (() => onOpen(recipe))}
            action={renderAction?.(recipe)}
          />
        ))}
      </ListRows>
    </Card>
  );
}
