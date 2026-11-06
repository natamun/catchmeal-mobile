import { MACROS } from '../../constants/macros';
import { MacroBadge } from './MacroBadge';

interface MacroSummaryProps {
  totals: { kcal: number; protein: number; carbs: number; fat: number };
}

/** Macros and calories of a meal being edited, on one line. */
export function MacroSummary({ totals }: MacroSummaryProps) {
  return (
    <div className="mb-2 flex min-h-12 items-center justify-between gap-3 rounded-xl border border-theme-200 px-3 py-1.5">
      <div className="flex items-center gap-3">
        {MACROS.map(({ key, label, color }) => (
          <MacroBadge
            key={key}
            label={label}
            color={color}
            size="md"
            value={Math.round(totals[key] * 10) / 10}
          />
        ))}
      </div>
      <span className="shrink-0 rounded-full bg-theme-50 px-3 py-1 text-base font-semibold text-theme-800">
        {Math.round(totals.kcal)} kcal
      </span>
    </div>
  );
}
