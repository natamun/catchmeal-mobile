import { Trash2 } from 'lucide-react';

import { useTwoTap } from '../../hooks/useTwoTap';

interface Props {
  /** Said by the button once armed, such as "Retirer ?". */
  confirmLabel: string;
  onConfirm: () => void;
}

/**
 * A red trash that asks twice: the first tap turns it into a solid red
 * "Retirer ?" pill, the second one confirms. Left alone, it goes back to a
 * trash after a few seconds, and a double tap too fast is not a yes. The
 * pill grows to the left over what is beside it, without moving it, so the
 * second tap lands where the first one did and nothing around changes size.
 */
export function ConfirmRemoveButton({ confirmLabel, onConfirm }: Props) {
  const { isArmed, tap } = useTwoTap(onConfirm);

  return (
    <div className="relative h-11 w-11 shrink-0">
      <button
        type="button"
        aria-label={isArmed ? confirmLabel : 'Retirer'}
        onClick={tap}
        className={`absolute top-1/2 right-0 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full font-semibold whitespace-nowrap transition-colors outline-none ${
          isArmed
            ? 'tap-area h-7 animate-pill-select gap-1 bg-red-500 px-2.5 text-xs text-white'
            : 'h-11 w-11 text-red-500 hover:bg-red-500/10'
        }`}
      >
        <Trash2 className={isArmed ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
        {isArmed && confirmLabel}
      </button>
    </div>
  );
}
