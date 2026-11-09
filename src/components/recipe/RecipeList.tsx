import { useState, type ReactNode } from 'react';

import { MACROS } from '../../constants/macros';
import { formatMinutes } from '../../utils/format';
import { ListCard, ListCardEmpty, ListCardLoading } from '../ui/ListCard';
import { LoadError } from '../ui/LoadError';
import { MacroBadge } from '../ui/MacroBadge';
import {
  EMPTY_FILTER_CRITERIA,
  matchesMacro,
  type FilterCriteria,
} from '../ui/macroFilter';
import { MacroSearchBar } from '../ui/MacroSearchBar';
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

  const query = criteria.query.trim().toLowerCase();
  const visible = active
    .filter((recipe) => {
      const serving = perServing(recipe);
      return (
        (!query || recipe.name.toLowerCase().includes(query)) &&
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
      return field === 'name'
        ? a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }) * dir
        : (perServing(a)[field] - perServing(b)[field]) * dir;
    });

  return (
    <ListCard
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
      {isLoading && <ListCardLoading />}

      {loadError && <LoadError message={loadError} onRetry={onRetry} />}

      {!isLoading && !loadError && active.length === 0 && (
        <ListCardEmpty>Aucune recette enregistrée.</ListCardEmpty>
      )}

      {!isLoading &&
        !loadError &&
        active.length > 0 &&
        visible.length === 0 && (
          <ListCardEmpty>
            Aucune recette ne correspond à cette recherche.
          </ListCardEmpty>
        )}

      <ul className="divide-y divide-theme-200">
        {visible.map((recipe) => {
          const serving = perServing(recipe);
          const content = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-theme-800">
                  {recipe.name}
                </span>
                <span className="block truncate text-xs text-theme-500">
                  {detailsOf(recipe)}
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-2.5 @lg:flex">
                {MACROS.map(({ key, label, color }) => (
                  <MacroBadge
                    key={key}
                    label={label}
                    color={color}
                    value={Math.round(serving[key] * 10) / 10}
                  />
                ))}
              </span>
              <span className="min-w-20 shrink-0 rounded-full bg-theme-50 px-2.5 py-0.5 text-center text-sm font-semibold text-theme-800">
                {Math.round(serving.kcal)} kcal
              </span>
            </>
          );
          return (
            <li key={recipe.id} className="even:bg-theme-50/60">
              {onOpen ? (
                <button
                  type="button"
                  onClick={() => onOpen(recipe)}
                  className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition-colors active:bg-theme-100"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-5 py-4">
                  {content}
                  {renderAction?.(recipe)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </ListCard>
  );
}
