import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { useToggleSet } from '../../hooks/useToggleSet';
import { ListCard, ListCardEmpty, ListCardLoading } from '../ui/ListCard';
import { LoadError } from '../ui/LoadError';
import { describeValues } from './format';
import type { TemplateItem, WorkoutItem, WorkoutTemplate } from './types';

interface Props {
  templates: WorkoutTemplate[];
  isLoading: boolean;
  loadError: string | null;
  onRetry?: () => void;
  headerAction?: ReactNode;
  /** The last time each exercise was done, recalled when unfolded. */
  latest: Map<number, WorkoutItem>;
  /** A button at the end of each row: edit, or the picker's selection. */
  renderAction?: (template: WorkoutTemplate) => ReactNode;
}

/** What to recall for an exercise of a favorite: the last time it was done. */
function reminderOf(item: TemplateItem, latest: Map<number, WorkoutItem>) {
  const last = latest.get(item.exerciseId);
  return last ? describeValues(last) : 'Jamais fait';
}

/**
 * The favorite sessions. Each one unfolds into its exercises, each with its
 * last values: the reminder at the gym.
 */
export function TemplateList({
  templates,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  latest,
  renderAction,
}: Props) {
  const [expandedIds, toggleExpanded] = useToggleSet<number>();

  return (
    <ListCard
      header={
        headerAction && (
          <>
            <h2 className="min-w-0 flex-1 text-sm font-semibold tracking-wide text-theme-500 uppercase">
              Mes séances favorites
            </h2>
            {headerAction}
          </>
        )
      }
    >
      {isLoading && <ListCardLoading />}
      {loadError && <LoadError message={loadError} onRetry={onRetry} />}
      {!isLoading && !loadError && templates.length === 0 && (
        <ListCardEmpty>Aucune séance favorite.</ListCardEmpty>
      )}

      <ul className="divide-y divide-theme-200">
        {templates.map((template) => {
          const isExpanded = expandedIds.has(template.id);
          return (
            <li key={template.id} className="px-5 py-4 even:bg-theme-50/60">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleExpanded(template.id)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                >
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-theme-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-theme-800">
                      {template.name}
                    </span>
                    <span className="truncate text-xs text-theme-500">
                      {template.items.length} exercice
                      {template.items.length > 1 ? 's' : ''}
                    </span>
                  </span>
                </button>
                {renderAction?.(template)}
              </div>
              <div
                className={`grid pl-7 transition-[grid-template-rows] duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <ul
                  className={`flex flex-col gap-1.5 overflow-hidden ${isExpanded ? 'pt-3' : ''}`}
                >
                  {template.items.map((item) => (
                    <li key={item.id} className="flex flex-col">
                      <span className="truncate text-sm text-theme-800">
                        {item.exerciseName}
                      </span>
                      <span className="truncate text-xs text-theme-500">
                        {reminderOf(item, latest)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </ListCard>
  );
}
