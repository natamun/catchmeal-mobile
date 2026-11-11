import { ChevronRight } from 'lucide-react';

interface Props {
  label: string;
  /** A short value shown at the right, dimmer, such as a count. */
  value?: string;
  onClick: () => void;
}

/**
 * A full-width row inside a card that opens more: a label in the accent, an
 * optional value and a chevron. It bleeds into the card's padding so its
 * pressed state reaches the edges of the text.
 */
export function ChevronRow({ label, value, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 flex h-11 min-w-0 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm transition-colors hover:bg-theme-100"
    >
      <span className="shrink-0 font-medium text-theme-500">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-theme-600 tabular-nums">
        {value}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-theme-600" />
    </button>
  );
}
