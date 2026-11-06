import type { ReactNode } from 'react';

import { formatKg } from '../../utils/format';
import { EditIconButton } from '../ui/EditIconButton';
import { ListCard, ListCardEmpty, ListCardLoading } from '../ui/ListCard';
import { LoadError } from '../ui/LoadError';
import type { TemplateItem, WorkoutTemplate } from './types';

interface Props {
  templates: WorkoutTemplate[];
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => void;
  headerAction: ReactNode;
  onEdit: (template: WorkoutTemplate) => void;
}

/** "45 min · 4 km/h · 10 %" for a cardio line, its name otherwise. */
function describeItem(item: TemplateItem) {
  const values = [
    item.durationMinutes !== null && `${formatKg(item.durationMinutes)} min`,
    item.speedKmh !== null && `${formatKg(item.speedKmh)} km/h`,
    item.inclinePercent !== null && `${formatKg(item.inclinePercent)} %`,
  ].filter(Boolean);
  return values.length > 0
    ? `${item.exerciseName} (${values.join(' · ')})`
    : item.exerciseName;
}

/** The favorite sessions, each with its exercises. */
export function TemplateList({
  templates,
  isLoading,
  loadError,
  onRetry,
  headerAction,
  onEdit,
}: Props) {
  return (
    <ListCard
      header={
        <>
          <h2 className="min-w-0 flex-1 text-sm font-semibold tracking-wide text-theme-500 uppercase">
            Mes séances favorites
          </h2>
          {headerAction}
        </>
      }
    >
      {isLoading && <ListCardLoading />}
      {loadError && <LoadError message={loadError} onRetry={onRetry} />}
      {!isLoading && !loadError && templates.length === 0 && (
        <ListCardEmpty>
          Aucune séance favorite. Crée ta première avec le +.
        </ListCardEmpty>
      )}

      <ul className="divide-y divide-theme-200">
        {templates.map((template) => (
          <li
            key={template.id}
            className="flex items-center gap-3 px-5 py-4 even:bg-theme-50/60"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-theme-800">
                {template.name}
              </p>
              <p className="truncate text-xs text-theme-500">
                {template.items.map(describeItem).join(', ') ||
                  'Aucun exercice'}
              </p>
            </div>
            <EditIconButton onClick={() => onEdit(template)} />
          </li>
        ))}
      </ul>
    </ListCard>
  );
}
