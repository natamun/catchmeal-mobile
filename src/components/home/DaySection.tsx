import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

import { AddCircleButton } from '../ui/AddCircleButton';
import { MacroBadges } from '../ui/MacroSummary';

type Totals = { kcal: number; protein: number; carbs: number; fat: number };

interface DaySectionProps {
  title: string;
  onAdd: () => void;
  /** The section's macros and calories, under its rows once it holds some. */
  totals?: Totals;
  isLoading: boolean;
  /** The section's rows (`<li>`), none while it is empty. */
  rows: ReactNode[];
}

const kcalText = (kcal: number) => `${Math.round(kcal)} kcal`;

/**
 * One section of the journal's day, a meal or the session: its title and
 * the "+", a spinner while the day loads, then its rows and, given, their
 * totals under them, like a sum.
 */
export function DaySection({
  title,
  onAdd,
  totals,
  isLoading,
  rows,
}: DaySectionProps) {
  const hasRows = rows.length > 0;
  const shownTotals = hasRows ? totals : undefined;

  return (
    <>
      <div
        className={`flex items-center justify-between gap-3 px-5 py-2.5 ${hasRows ? 'border-b border-theme-100' : ''}`}
      >
        <h3 className="text-base font-semibold text-theme-500">{title}</h3>
        <AddCircleButton onClick={onAdd} />
      </div>

      {isLoading && (
        // Overflow hidden: the reveal grows the row from no height.
        <div className="flex h-12 animate-delayed-reveal items-center justify-center overflow-hidden border-t border-theme-100">
          <LoaderCircle className="h-5 w-5 animate-spin text-theme-400" />
        </div>
      )}

      {hasRows && (
        <ul className="animate-fade-in-up divide-y divide-theme-100 px-5">
          {rows}
        </ul>
      )}

      {shownTotals && (
        <div className="flex h-9 animate-fade-in-up items-center justify-between gap-3 border-t border-dashed border-theme-200 px-5">
          <MacroBadges totals={shownTotals} size="sm" />
          <span className="text-sm font-bold text-theme-800 tabular-nums">
            {kcalText(shownTotals.kcal)}
          </span>
        </div>
      )}
    </>
  );
}
