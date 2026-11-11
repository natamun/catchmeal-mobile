import { MACROS } from '../../constants/macros';
import { MacroBadge } from './MacroBadge';

type Totals = { kcal: number; protein: number; carbs: number; fat: number };

/** The three macros as coloured dots and grams, on one line. */
export function MacroBadges({ totals }: { totals: Totals }) {
  return (
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
  );
}

/** The calories, in a pill. */
export function KcalPill({ kcal }: { kcal: number }) {
  return (
    <span className="shrink-0 rounded-full bg-theme-100 px-3 py-1 text-base font-semibold text-theme-800 tabular-nums">
      {Math.round(kcal)} kcal
    </span>
  );
}

/** Macros and calories of a meal being edited, on one line. */
export function MacroSummary({ totals }: { totals: Totals }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <MacroBadges totals={totals} />
      <KcalPill kcal={totals.kcal} />
    </div>
  );
}
