import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { useToggleSet } from '../../hooks/useToggleSet';
import { Card } from '../ui/Card';
import { ListRow, ListRows } from '../ui/ListRow';
import { ListStatus } from '../ui/ListStatus';
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
  /** A button at the end of each row, such as the picker's selection. */
  renderAction?: (template: WorkoutTemplate) => ReactNode;
  /** Given, a tap on the row opens the favorite instead of unfolding it. */
  onOpen?: (template: WorkoutTemplate) => void;
}

/** What to recall for an exercise of a favorite: the last time it was done. */
function reminderOf(item: TemplateItem, latest: Map<number, WorkoutItem>) {
  const last = latest.get(item.exerciseId);
  return last ? describeValues(last) : 'Jamais fait';
}

/**
 * The favorite sessions. Each one opens, or unfolds into its exercises, each
 * with its last values: the reminder at the gym.
 */
export function TemplateList({
  templates,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  latest,
  renderAction,
  onOpen,
}: Props) {
  const [expandedIds, toggleExpanded] = useToggleSet<number>();

  return (
    <Card
      flush
      header={
        headerAction && (
          <>
            <h2 className="min-w-0 flex-1 text-sm font-semibold text-theme-500">
              Mes séances favorites
            </h2>
            {headerAction}
          </>
        )
      }
    >
      <ListStatus
        isLoading={isLoading}
        loadError={loadError}
        onRetry={onRetry}
        total={templates.length}
        shown={templates.length}
        empty="Aucune séance favorite."
      />

      <ListRows>
        {templates.map((template) => {
          const count = `${template.items.length} exercice${template.items.length > 1 ? 's' : ''}`;
          if (onOpen) {
            return (
              <ListRow
                key={template.id}
                title={template.name}
                subtitle={count}
                onClick={() => onOpen(template)}
                action={renderAction?.(template)}
              />
            );
          }
          const isExpanded = expandedIds.has(template.id);
          return (
            <ListRow
              key={template.id}
              title={template.name}
              subtitle={count}
              leading={
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-theme-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              }
              onClick={() => toggleExpanded(template.id)}
              action={renderAction?.(template)}
            >
              <div
                className={`grid pr-5 pl-12 transition-[grid-template-rows] duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <ul
                  className={`flex flex-col gap-1.5 overflow-hidden ${isExpanded ? 'pb-3' : ''}`}
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
            </ListRow>
          );
        })}
      </ListRows>
    </Card>
  );
}
