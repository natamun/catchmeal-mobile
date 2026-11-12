import { useState } from 'react';
import { Ellipsis, Trash2, type LucideIcon } from 'lucide-react';

import { useTwoTap } from '../../hooks/useTwoTap';
import { BottomSheet } from './BottomSheet';
import { IconButton } from './IconButton';

/** An action of the "⋯" sheet, listed above the delete. */
export interface MenuAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
}

const MENU_ITEM_CLASS =
  'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-1 text-left text-base font-medium transition-colors';

interface Props {
  /** The title of the sheet: what the actions apply to. */
  title: string;
  actions?: MenuAction[];
  /**
   * Adds the delete action, in red, below the others. It asks twice: called
   * on the second tap, as the sheet closes.
   */
  onDelete?: () => void;
  /** What the delete action says, such as "Supprimer l'aliment". */
  deleteLabel?: string;
}

/**
 * A "⋯" button that opens a sheet from the bottom with the secondary actions
 * of a dialog or a page, such as duplicating, and the delete in red: the
 * header stays calm, and a rare action is never one tap away from another.
 * The delete asks twice in place, "Confirmer ?", so the finger never travels
 * to a dialog.
 */
export function ActionMenu({
  title,
  actions = [],
  onDelete,
  deleteLabel = 'Supprimer',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const remove = useTwoTap(() => {
    setIsOpen(false);
    onDelete?.();
  });

  const close = () => {
    setIsOpen(false);
    remove.disarm();
  };

  const item = (onSelect: () => void) => () => {
    close();
    onSelect();
  };

  return (
    <>
      <IconButton label="Plus d'actions" onClick={() => setIsOpen(true)}>
        <Ellipsis className="h-6 w-6" />
      </IconButton>
      <BottomSheet open={isOpen} onClose={close} title={title}>
        {actions.map(({ label, icon: Icon, onSelect }) => (
          <button
            key={label}
            type="button"
            onClick={item(onSelect)}
            className={`${MENU_ITEM_CLASS} text-theme-800 hover:bg-theme-100`}
          >
            <Icon className="h-5 w-5 shrink-0 text-theme-500" />
            {label}
          </button>
        ))}
        {onDelete && (
          <button
            type="button"
            onClick={remove.tap}
            className={`${MENU_ITEM_CLASS} ${
              remove.isArmed
                ? '-mx-2 animate-pill-select bg-red-500 px-3 text-white'
                : 'text-red-500 hover:bg-red-500/10'
            }`}
          >
            <Trash2 className="h-5 w-5 shrink-0" />
            {remove.isArmed ? 'Confirmer ?' : deleteLabel}
          </button>
        )}
      </BottomSheet>
    </>
  );
}
