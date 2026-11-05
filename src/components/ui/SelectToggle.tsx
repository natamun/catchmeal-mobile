import { Check } from 'lucide-react';

interface SelectToggleProps {
  selected: boolean;
  onToggle: () => void;
}

/** Square check button used to pick items in a list. */
export function SelectToggle({ selected, onToggle }: SelectToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`tap-area relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors ${
        selected
          ? 'border-theme-500 bg-theme-500 text-on-accent'
          : 'border-theme-300 text-transparent hover:border-theme-500'
      }`}
    >
      <Check className="h-4 w-4" />
    </button>
  );
}
