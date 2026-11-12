import { MACROS } from '../../constants/macros';
import { roundDecimals } from '../../utils/decimals';
import { MacroBadge } from './MacroBadge';
import type { Macros } from './macroFilter';

/**
 * The end of a food, meal or recipe row: the macro badges, on a wide screen
 * only (the list is an `@container`), then the calories.
 */
export function MacroTrail({ values }: { values: Macros }) {
  return (
    <>
      <span className="hidden shrink-0 items-center gap-2.5 @lg:flex">
        {MACROS.map(({ key, label, color }) => (
          <MacroBadge
            key={key}
            label={label}
            color={color}
            value={roundDecimals(values[key], 1)}
          />
        ))}
      </span>
      <span className="shrink-0 text-right text-sm font-semibold whitespace-nowrap text-theme-800 tabular-nums">
        {Math.round(values.kcal)} kcal
      </span>
    </>
  );
}
