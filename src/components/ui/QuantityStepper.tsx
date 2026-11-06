import { roundDecimals } from '../../utils/decimals';

const STEP_BUTTON_CLASS =
  'tap-area relative flex h-10 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-theme-50 text-sm font-bold text-theme-600 transition-colors hover:bg-theme-100';

interface QuantityStepperProps {
  quantity: number;
  unitLabel: string;
  onAdjust: (delta: number) => void;
}

/**
 * Buttons that change a quantity by -10, -1, +1 or +10, around its value,
 * across the whole width.
 */
export function QuantityStepper({
  quantity,
  unitLabel,
  onAdjust,
}: QuantityStepperProps) {
  const stepButton = (delta: number, text: string) => (
    <button
      type="button"
      onClick={() => onAdjust(delta)}
      className={STEP_BUTTON_CLASS}
    >
      {text}
    </button>
  );

  return (
    <div className="flex items-center gap-2 select-none">
      {stepButton(-10, '--')}
      {stepButton(-1, '-')}
      <span className="min-w-0 flex-1 text-center text-base font-semibold whitespace-nowrap text-theme-800 tabular-nums">
        {roundDecimals(quantity, 1)}
        {unitLabel}
      </span>
      {stepButton(1, '+')}
      {stepButton(10, '++')}
    </div>
  );
}
