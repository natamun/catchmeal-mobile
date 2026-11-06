interface SelectionBarProps {
  count: number;
  onNext: () => void;
}

/**
 * The bar held at the bottom of a picker: how many lines are picked, and the
 * button that moves on to the review once there is at least one.
 */
export function SelectionBar({ count, onNext }: SelectionBarProps) {
  return (
    <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 mx-3 flex items-center justify-between gap-3 rounded-2xl border border-theme-200 bg-surface p-3 shadow-lg md:mx-auto md:w-full md:max-w-md">
      <span className="text-sm text-theme-600">
        {count === 0
          ? 'Aucune sélection'
          : `${count} sélectionné${count > 1 ? 's' : ''}`}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={count === 0}
        className="cursor-pointer rounded-xl bg-theme-500 px-5 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-theme-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Suivant
      </button>
    </div>
  );
}
