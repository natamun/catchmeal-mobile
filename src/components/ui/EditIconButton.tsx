import { Pencil } from 'lucide-react';

const SIZE = {
  md: { button: 'h-6 w-6', icon: 'h-4 w-4' },
  lg: { button: 'h-8 w-8', icon: 'h-5 w-5' },
} as const;

interface EditIconButtonProps {
  onClick: () => void;
  size?: keyof typeof SIZE;
}

/** Pencil button; its touch area is larger than the icon. */
export function EditIconButton({ onClick, size = 'md' }: EditIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap-area relative flex shrink-0 cursor-pointer items-center justify-center text-green-400 transition-colors hover:text-green-600 ${SIZE[size].button}`}
    >
      <Pencil className={SIZE[size].icon} />
    </button>
  );
}
