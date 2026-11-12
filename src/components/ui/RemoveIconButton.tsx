import { X } from 'lucide-react';

interface RemoveIconButtonProps {
  /** What goes, such as "Retirer la série 2". */
  label: string;
  onClick: () => void;
  className?: string;
}

/**
 * The small grey cross that takes one line out of a list at once: a set, a
 * recipe section or step, a shopping line. It turns red while pressed. A
 * whole item of a meal or a session asks twice, with `ConfirmRemoveButton`.
 */
export function RemoveIconButton({
  label,
  onClick,
  className = '',
}: RemoveIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`tap-area relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-theme-400 transition-colors hover:bg-theme-100 hover:text-red-500 ${className}`}
    >
      <X className="h-4 w-4" />
    </button>
  );
}
