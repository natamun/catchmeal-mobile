import { useRef, useState } from 'react';

import { useBlurOnKeyboardClose } from '../../hooks/useBlurOnKeyboardClose';
import { parseDecimal, roundDecimals } from '../../utils/decimals';

const STEP_BUTTON_CLASS =
  'tap-area relative flex h-10 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-theme-50 text-sm font-bold text-theme-600 transition-colors hover:bg-theme-100';

/** The quantity as a number to type, in the unit it is shown in. */
interface Typing {
  value: number;
  /** Written after the field, such as "g" or "biscuits". */
  unit: string;
  onType: (value: number) => void;
}

interface QuantityStepperProps {
  /** The quantity as shown, such as "150g" or "4 biscuits". */
  text: string;
  /** A second line under it, such as the weight of the biscuits. */
  detail?: string;
  onAdjust: (delta: number) => void;
  /** Lets a tap on the quantity type it on the keyboard. */
  typing?: Typing;
}

/**
 * Buttons that change a quantity by -10, -1, +1 or +10 of its unit, around
 * its value, across the whole width. With `typing`, a tap on the value opens
 * the keyboard to type a large quantity at once: the field takes the whole
 * width meanwhile, and the buttons come back once it is done.
 */
export function QuantityStepper({
  text,
  detail,
  onAdjust,
  typing,
}: QuantityStepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useBlurOnKeyboardClose(inputRef);

  const stepButton = (delta: number, label: string) => (
    <button
      type="button"
      onClick={() => onAdjust(delta)}
      className={STEP_BUTTON_CLASS}
    >
      {label}
    </button>
  );

  const commit = () => {
    const value = draft === null ? null : parseDecimal(draft);
    if (typing && value !== null) typing.onType(value);
    setDraft(null);
  };

  const shown = (
    <>
      <span className="text-base font-semibold whitespace-nowrap text-theme-800">
        {text}
      </span>
      {detail && <span className="text-xs text-theme-500">{detail}</span>}
    </>
  );

  if (typing && draft !== null) {
    return (
      <div className="flex h-10 items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          // The field appears on a tap, to be typed in right away.
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="h-full min-w-0 flex-1 rounded-lg border border-theme-400 bg-surface px-3 text-center text-base font-semibold text-theme-800 tabular-nums outline-none"
        />
        <span className="max-w-28 shrink-0 truncate text-sm text-theme-500">
          {typing.unit}
        </span>
      </div>
    );
  }

  let value;
  if (typing) {
    value = (
      <button
        type="button"
        onClick={() =>
          setDraft(String(roundDecimals(typing.value, 2)).replace('.', ','))
        }
        className="flex min-w-0 flex-1 cursor-text flex-col items-center rounded-lg py-0.5 tabular-nums underline decoration-theme-300 decoration-dotted underline-offset-4 transition-colors hover:bg-theme-50"
      >
        {shown}
      </button>
    );
  } else {
    value = (
      <span className="flex min-w-0 flex-1 flex-col items-center tabular-nums">
        {shown}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 select-none">
      {stepButton(-10, '−10')}
      {stepButton(-1, '−1')}
      {value}
      {stepButton(1, '+1')}
      {stepButton(10, '+10')}
    </div>
  );
}
