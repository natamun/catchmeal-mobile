import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  /** The day it adds to, such as "Vendredi 6 novembre". */
  subtitle: string;
  onClose: () => void;
  /** Goes back to the first step, from the second. */
  onBack?: () => void;
}

/**
 * Top of an adding flow, staying while its list scrolls: what is added and
 * to which day, and an arrow back, to the first step or out of the flow.
 */
export function FlowHeader({ title, subtitle, onClose, onBack }: Props) {
  return (
    <div className="sticky top-0 z-10 -mx-6 flex items-center gap-2 bg-theme-50 px-4 py-3">
      <button
        type="button"
        onClick={onBack ?? onClose}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-theme-600 transition-colors hover:bg-theme-100 active:bg-theme-200"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-bold text-theme-800">{title}</h2>
        <p className="truncate text-sm text-theme-500">{subtitle}</p>
      </div>
    </div>
  );
}
