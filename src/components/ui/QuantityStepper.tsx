const STEP_BUTTON_CLASS =
  'tap-area relative flex h-10 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-theme-50 text-sm font-bold text-theme-600 transition-colors hover:bg-theme-100';

interface QuantityStepperProps {
  /** The quantity as shown, such as "150g" or "4 biscuits". */
  text: string;
  /** A second line under it, such as the weight of the biscuits. */
  detail?: string;
  onAdjust: (delta: number) => void;
}

/**
 * Buttons that change a quantity by -10, -1, +1 or +10 of its unit, around
 * its value, across the whole width.
 */
export function QuantityStepper({
  text,
  detail,
  onAdjust,
}: QuantityStepperProps) {
  const stepButton = (delta: number, label: string) => (
    <button
      type="button"
      onClick={() => onAdjust(delta)}
      className={STEP_BUTTON_CLASS}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2 select-none">
      {stepButton(-10, '--')}
      {stepButton(-1, '-')}
      <span className="flex min-w-0 flex-1 flex-col items-center tabular-nums">
        <span className="text-base font-semibold whitespace-nowrap text-theme-800">
          {text}
        </span>
        {detail && <span className="text-xs text-theme-500">{detail}</span>}
      </span>
      {stepButton(1, '+')}
      {stepButton(10, '++')}
    </div>
  );
}
