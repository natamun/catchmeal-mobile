import { Plus } from 'lucide-react';

interface AddCircleButtonProps {
  onClick: () => void;
}

/** Round green "+" button. */
export function AddCircleButton({ onClick }: AddCircleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-area relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-theme-500 text-on-accent transition-colors hover:bg-theme-600"
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}
