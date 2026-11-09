import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  /** The line under the title, such as the day it adds to. */
  subtitle: string;
  onClose: () => void;
  /** Goes back to the first step, from the second. */
  onBack?: () => void;
  /** Buttons on the right, such as edit or delete. */
  action?: ReactNode;
}

/**
 * Top of a flow page, staying while it scrolls: what is shown and the line
 * under it, an arrow back (to the first step or out of the flow), and the
 * page's own buttons on the right.
 */
export function FlowHeader({
  title,
  subtitle,
  onClose,
  onBack,
  action,
}: Props) {
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
      {action}
    </div>
  );
}
