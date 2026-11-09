interface PillTabsProps<T extends string> {
  name: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  /** Shares the whole width between the options. */
  fill?: boolean;
  className?: string;
}

/**
 * A choice between a few options shown as pills, real radio buttons hidden
 * underneath.
 */
export function PillTabs<T extends string>({
  name,
  options,
  value,
  onChange,
  fill = false,
  className = '',
}: PillTabsProps<T>) {
  return (
    <div
      className={`flex gap-1.5 rounded-xl border border-theme-200 bg-surface p-1.5 ${className}`}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={`tap-area relative flex cursor-pointer items-center justify-center rounded-lg py-1.5 text-sm font-medium text-theme-500 transition-colors has-checked:animate-pill-select has-checked:bg-theme-500 has-checked:text-on-accent ${fill ? 'min-w-0 flex-1 px-1' : 'px-3'}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
