const TOGGLE_CLASS =
  'tap-area relative max-w-24 cursor-pointer truncate rounded-md px-2.5 py-1 text-xs font-semibold transition-colors';

interface UnitToggleProps {
  unit: string;
  portion: string;
  inPortions: boolean;
  onChange: (inPortions: boolean) => void;
}

/** Counts a food in its base unit or in portions: "g | biscuit". */
export function UnitToggle({
  unit,
  portion,
  inPortions,
  onChange,
}: UnitToggleProps) {
  const option = (value: boolean, label: string) => (
    <button
      type="button"
      aria-pressed={inPortions === value}
      onClick={() => onChange(value)}
      className={`${TOGGLE_CLASS} ${
        inPortions === value
          ? 'bg-theme-500 text-on-accent'
          : 'text-theme-600 hover:bg-theme-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex shrink-0 gap-0.5 rounded-lg border border-theme-200 p-0.5">
      {option(false, unit)}
      {option(true, portion)}
    </div>
  );
}
