import type { ReactNode } from 'react';

import { BottomSheet } from './BottomSheet';
import { ConfirmRemoveButton } from './ConfirmRemoveButton';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The item's full name. */
  title: string;
  /** Called once the trash is confirmed by a second tap. */
  onRemove: () => void;
  /** What it brings, live, at the top: calories and macros. */
  detail?: ReactNode;
  /** A small control at the right of the detail, such as the unit toggle. */
  aside?: ReactNode;
  /** The controls that change it, then what saves them. */
  children?: ReactNode;
}

/**
 * The sheet of one item of a list, a food of a meal or an exercise of a
 * session: its full name with a trash that asks twice, what it brings, and
 * its controls.
 */
export function ItemSheet({
  open,
  onClose,
  title,
  onRemove,
  detail,
  aside,
  children,
}: Props) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      action={
        <ConfirmRemoveButton
          // Each opening starts calm, even right after an armed one.
          key={String(open)}
          confirmLabel="Retirer ?"
          onConfirm={onRemove}
        />
      }
    >
      <div className="flex flex-col gap-3">
        {(detail || aside) && (
          <div className="flex min-h-9 items-center justify-between gap-3">
            {detail ?? <span />}
            {aside}
          </div>
        )}
        {children}
      </div>
    </BottomSheet>
  );
}
