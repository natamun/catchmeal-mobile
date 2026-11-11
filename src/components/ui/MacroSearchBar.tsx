import { useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Slider from '@radix-ui/react-slider';
import { ChevronRight, Filter } from 'lucide-react';

import { MACROS } from '../../constants/macros';
import { useBlurOnKeyboardClose } from '../../hooks/useBlurOnKeyboardClose';
import { BaseDialog } from './BaseDialog';
import { PRIMARY_BUTTON_CLASS } from './buttonStyle';
import { DropdownPanel } from './DropdownPanel';
import {
  EMPTY_FILTER_CRITERIA,
  type FilterCriteria,
  type MacroFilter,
  type MacroKey,
  type Macros,
  type SortOption,
} from './macroFilter';
import { SearchInput } from './SearchInput';
import { SelectDropdown } from './SelectDropdown';

type MacroDraft = Record<MacroKey, MacroFilter>;

const MACRO_FIELDS: {
  key: MacroKey;
  label: string;
  unit: string;
  step: number;
}[] = [
  { key: 'kcal', label: 'Kcal', unit: 'kcal', step: 1 },
  { key: 'protein', label: 'Protéines', unit: 'g', step: 1 },
  { key: 'carbs', label: 'Glucides', unit: 'g', step: 1 },
  { key: 'fat', label: 'Lipides', unit: 'g', step: 1 },
];

const SORT_OPTIONS: { value: string; label: string; option: SortOption }[] = [
  {
    value: 'name-asc',
    label: 'Nom (A → Z)',
    option: { field: 'name', direction: 'asc' },
  },
  {
    value: 'name-desc',
    label: 'Nom (Z → A)',
    option: { field: 'name', direction: 'desc' },
  },
  {
    value: 'kcal-asc',
    label: 'Kcal (croissant)',
    option: { field: 'kcal', direction: 'asc' },
  },
  {
    value: 'kcal-desc',
    label: 'Kcal (décroissant)',
    option: { field: 'kcal', direction: 'desc' },
  },
  {
    value: 'protein-asc',
    label: 'Protéines (croissant)',
    option: { field: 'protein', direction: 'asc' },
  },
  {
    value: 'protein-desc',
    label: 'Protéines (décroissant)',
    option: { field: 'protein', direction: 'desc' },
  },
  {
    value: 'carbs-asc',
    label: 'Glucides (croissant)',
    option: { field: 'carbs', direction: 'asc' },
  },
  {
    value: 'carbs-desc',
    label: 'Glucides (décroissant)',
    option: { field: 'carbs', direction: 'desc' },
  },
  {
    value: 'fat-asc',
    label: 'Lipides (croissant)',
    option: { field: 'fat', direction: 'asc' },
  },
  {
    value: 'fat-desc',
    label: 'Lipides (décroissant)',
    option: { field: 'fat', direction: 'desc' },
  },
];

/**
 * Smallest and largest value of a macro among the items, used as the slider
 * ends; 0 to 100 for an empty list.
 */
function boundsOf(items: Macros[], key: MacroKey): MacroFilter {
  if (items.length === 0) {
    return { min: 0, max: 100 };
  }
  const values = items.map((item) => item[key]);
  return {
    min: Math.floor(Math.min(...values)),
    max: Math.ceil(Math.max(...values)),
  };
}

/** An unlimited range (the default) is shown as the full slider. */
function clampToBounds(filter: MacroFilter, bounds: MacroFilter): MacroFilter {
  return {
    min: Number.isFinite(filter.min) ? filter.min : bounds.min,
    max: Number.isFinite(filter.max) ? filter.max : bounds.max,
  };
}

const ALL_CATEGORIES = '';

/** A handle of a range: large enough for a thumb, with a halo while held. */
const THUMB_CLASS =
  'block h-6 w-6 cursor-grab rounded-full border-2 border-surface bg-theme-500 shadow-md transition-shadow outline-none focus-visible:ring-4 focus-visible:ring-theme-500/25 active:cursor-grabbing active:ring-8 active:ring-theme-500/15';

interface MacroSearchBarProps {
  items: Macros[];
  criteria: FilterCriteria;
  onFilterChange: (criteria: FilterCriteria) => void;
  /** The categories to filter on, for a list that has some. */
  categories?: { value: string; label: string }[];
  /** What the values are, under the sliders. */
  note?: string;
}

/** The color of a macro's dots in the lists, none for the calories. */
const dotOf = (key: MacroKey) =>
  MACROS.find((macro) => macro.key === key)?.color;

/**
 * Search bar of the food, meal and recipe lists. The text filters right
 * away; the filter dialog (sort, category when the list has some, one slider
 * per macro, which also tells the colors of the macro dots of the lists)
 * applies its choices only when "Appliquer" is pressed. The filter icon is
 * filled while a range is narrowed or a category kept.
 */
export function MacroSearchBar({
  items,
  criteria,
  onFilterChange,
  categories = [],
  note = 'Valeurs en grammes',
}: MacroSearchBarProps) {
  const [draftMacros, setDraftMacros] = useState<MacroDraft>(
    EMPTY_FILTER_CRITERIA,
  );
  const [draftSort, setDraftSort] = useState<SortOption>(
    EMPTY_FILTER_CRITERIA.sort,
  );
  const [draftCategory, setDraftCategory] = useState<string | null>(null);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [dialogNode, setDialogNode] = useState<HTMLDialogElement | null>(null);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useBlurOnKeyboardClose(inputRef);

  const macroBounds = useMemo<MacroDraft>(
    () => ({
      kcal: boundsOf(items, 'kcal'),
      protein: boundsOf(items, 'protein'),
      carbs: boundsOf(items, 'carbs'),
      fat: boundsOf(items, 'fat'),
    }),
    [items],
  );

  const hasActiveFilters =
    criteria.category !== null ||
    MACRO_FIELDS.some(
      (field) =>
        criteria[field.key].min > macroBounds[field.key].min ||
        criteria[field.key].max < macroBounds[field.key].max,
    );

  const currentSortValue = `${draftSort.field}-${draftSort.direction}`;

  const openFilterDialog = () => {
    setDraftMacros({
      kcal: clampToBounds(criteria.kcal, macroBounds.kcal),
      protein: clampToBounds(criteria.protein, macroBounds.protein),
      carbs: clampToBounds(criteria.carbs, macroBounds.carbs),
      fat: clampToBounds(criteria.fat, macroBounds.fat),
    });
    setDraftSort(criteria.sort);
    setDraftCategory(criteria.category);
    filterDialogRef.current?.showModal();
  };

  const closeFilterDialog = () => {
    filterDialogRef.current?.close();
  };

  const updateQuery = (query: string) => {
    onFilterChange({ ...criteria, query });
  };

  const updateDraftMacro = (key: MacroKey, patch: Partial<MacroFilter>) => {
    setDraftMacros({
      ...draftMacros,
      [key]: { ...draftMacros[key], ...patch },
    });
  };

  const applyFilters = () => {
    onFilterChange({
      ...criteria,
      ...draftMacros,
      sort: draftSort,
      category: draftCategory,
    });
    closeFilterDialog();
  };

  const resetFilters = () => {
    setDraftMacros(macroBounds);
    setDraftCategory(null);
  };

  return (
    <div className="relative flex-1">
      <SearchInput
        ref={inputRef}
        data-hides-nav
        value={criteria.query}
        onValueChange={updateQuery}
        trailing={
          <button
            type="button"
            onClick={openFilterDialog}
            aria-label="Trier et filtrer"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-theme-400 transition-colors hover:bg-theme-100 hover:text-theme-600"
          >
            <Filter
              className={`h-5 w-5 ${hasActiveFilters ? 'fill-theme-400' : ''}`}
            />
          </button>
        }
      />

      <BaseDialog
        dialogRef={filterDialogRef}
        title="Trier et filtrer"
        maxWidth="sm"
        onClose={() => setIsSortOpen(false)}
        onDialogNode={setDialogNode}
      >
        <Popover.Root open={isSortOpen} onOpenChange={setIsSortOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-theme-200 bg-surface px-4 py-2.75 text-base text-theme-800 transition-colors hover:bg-theme-50 data-[state=open]:bg-theme-50"
            >
              {SORT_OPTIONS.find((o) => o.value === currentSortValue)?.label}
              <ChevronRight
                className={`h-4 w-4 text-theme-400 transition-transform ${isSortOpen ? 'rotate-90' : ''}`}
              />
            </button>
          </Popover.Trigger>
          <DropdownPanel container={dialogNode} matchAnchorWidth>
            {SORT_OPTIONS.map(({ value, label, option }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setDraftSort(option);
                  setIsSortOpen(false);
                }}
                className={`cursor-pointer border-t border-theme-100 px-4 py-2 text-left text-sm transition-colors first:border-t-0 hover:bg-theme-50 ${
                  value === currentSortValue
                    ? 'font-semibold text-theme-800'
                    : 'text-theme-600'
                }`}
              >
                {label}
              </button>
            ))}
          </DropdownPanel>
        </Popover.Root>

        {categories.length > 0 && (
          <SelectDropdown
            value={draftCategory ?? ALL_CATEGORIES}
            options={[
              { value: ALL_CATEGORIES, label: 'Toutes les catégories' },
              ...categories,
            ]}
            onChange={(value) => setDraftCategory(value || null)}
            container={dialogNode}
          />
        )}

        <div className="flex flex-col gap-3 border-t border-theme-100 pt-5">
          <div className="flex flex-col gap-5">
            {MACRO_FIELDS.map(({ key, label, unit, step }) => {
              const { min, max } = macroBounds[key];
              return (
                <div key={key} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-theme-700">
                      {dotOf(key) && (
                        <span
                          className={`h-2 w-2 rounded-full ${dotOf(key)}`}
                        />
                      )}
                      {label}
                    </span>
                    <span className="text-xs text-theme-500">
                      {draftMacros[key].min} – {draftMacros[key].max} {unit}
                    </span>
                  </div>
                  <Slider.Root
                    min={min}
                    // A single value still makes a slider that can be held.
                    max={max > min ? max : min + 1}
                    step={step}
                    value={[draftMacros[key].min, draftMacros[key].max]}
                    onValueChange={([low, high]) =>
                      updateDraftMacro(key, { min: low, max: high })
                    }
                    className="relative flex h-8 w-full touch-none items-center select-none"
                  >
                    <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-theme-100">
                      <Slider.Range className="absolute h-full rounded-full bg-theme-400" />
                    </Slider.Track>
                    <Slider.Thumb
                      aria-label={`${label} minimum`}
                      className={THUMB_CLASS}
                    />
                    <Slider.Thumb
                      aria-label={`${label} maximum`}
                      className={THUMB_CLASS}
                    />
                  </Slider.Root>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="cursor-pointer text-xs font-medium text-theme-500 underline-offset-2 hover:underline"
            >
              Réinitialiser
            </button>
            <span className="text-xs text-theme-400">{note}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={applyFilters}
          className={PRIMARY_BUTTON_CLASS}
        >
          Appliquer
        </button>
      </BaseDialog>
    </div>
  );
}
