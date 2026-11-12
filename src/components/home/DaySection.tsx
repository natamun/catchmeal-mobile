import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

import { AddCircleButton } from '../ui/AddCircleButton';
import { EditIconButton } from '../ui/EditIconButton';

interface DaySectionProps {
  title: string;
  onAdd: () => void;
  /** Shows the pencil beside the title, once there is something to edit. */
  onEdit?: () => void;
  /** The section's calories, beside the "+" once it holds something. */
  kcal?: number;
  isLoading: boolean;
  /** The section's rows (`<li>`), none while it is empty. */
  rows: ReactNode[];
}

/**
 * One section of the journal's day, a meal or the session: its title with
 * the pencil, the calories and the "+", a spinner while the day loads, then
 * its rows.
 */
export function DaySection({
  title,
  onAdd,
  onEdit,
  kcal,
  isLoading,
  rows,
}: DaySectionProps) {
  const hasRows = rows.length > 0;

  return (
    <>
      <div
        className={`flex items-center justify-between gap-3 px-5 py-4 ${hasRows ? 'border-b border-theme-100' : ''}`}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-theme-500">{title}</h3>
          {onEdit && (
            <div className="animate-fade-in-up">
              <EditIconButton onClick={onEdit} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasRows && kcal !== undefined && (
            <span className="animate-fade-in-up text-sm font-semibold text-theme-800 max-2xs:hidden">
              {Math.round(kcal)} kcal
            </span>
          )}
          <AddCircleButton onClick={onAdd} />
        </div>
      </div>

      {isLoading && (
        // Overflow hidden: the reveal grows the row from no height.
        <div className="flex h-12 animate-delayed-reveal items-center justify-center overflow-hidden border-t border-theme-100">
          <LoaderCircle className="h-5 w-5 animate-spin text-theme-400" />
        </div>
      )}

      {hasRows && (
        <ul className="animate-fade-in-up divide-y divide-theme-100 px-5 py-2">
          {rows}
        </ul>
      )}
    </>
  );
}
