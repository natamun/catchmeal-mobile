import { useCallback, useState, type ReactNode, type RefObject } from 'react';
import { Ellipsis, Trash2, X } from 'lucide-react';

import { BottomSheet } from './BottomSheet';

const MAX_WIDTH_CLASS = {
  sm: 'max-w-sm',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
} as const;

const HEADER_BUTTON_CLASS =
  // No outline: the dialog focuses this button as it opens, and a ring around
  // it looked like a selected button.
  'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-theme-400 outline-none transition-colors hover:bg-theme-50 active:bg-theme-100';

interface BaseDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  title: string;
  maxWidth?: keyof typeof MAX_WIDTH_CLASS;
  /** Adds a "⋯" button that opens a sheet with this delete action, in red. */
  onDelete?: () => void;
  /** What the delete action says, such as "Supprimer l'aliment". */
  deleteLabel?: string;
  onClose?: () => void;
  onDialogNode?: (node: HTMLDialogElement | null) => void;
  children: ReactNode;
}

/**
 * Modal used by every dialog of the app: a native <dialog> opened with
 * showModal(), with a title, a close button and scrollable content. A click on
 * the blurred backdrop closes it (that click lands on the <dialog> element
 * itself). With `onDelete`, a "⋯" button next to the close button opens a
 * sheet from the bottom with the delete action in red: the header stays calm,
 * and a rare action is never one tap away from the close button.
 *
 * `onDialogNode` hands the <dialog> element to the dropdowns, which must render
 * inside it to stay usable above the modal.
 */
export function BaseDialog({
  dialogRef,
  title,
  maxWidth = 'lg',
  onDelete,
  deleteLabel = 'Supprimer',
  onClose,
  onDialogNode,
  children,
}: BaseDialogProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const setRefs = useCallback(
    (node: HTMLDialogElement | null) => {
      dialogRef.current = node;
      onDialogNode?.(node);
    },
    [dialogRef, onDialogNode],
  );

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={setRefs}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeDialog();
        }
      }}
      className={`dialog-fade m-auto w-[calc(100vw-2rem)] ${MAX_WIDTH_CLASS[maxWidth]} overflow-hidden rounded-2xl border-none bg-surface p-0 shadow-lg`}
    >
      <div className="flex max-h-[calc(100dvh-3rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col">
        {/* The header stays out of the scroll, so the close button never leaves. */}
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-4 sm:px-6 sm:pt-6">
          <h3 className="min-w-0 truncate text-lg font-bold text-theme-800">
            {title}
          </h3>
          <div className="-my-2 -mr-2 flex shrink-0 items-center gap-1">
            {onDelete && (
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                aria-label="Plus d'actions"
                className={`${HEADER_BUTTON_CLASS} hover:text-theme-600`}
              >
                <Ellipsis className="h-6 w-6" />
              </button>
            )}
            <button
              type="button"
              onClick={closeDialog}
              className={`${HEADER_BUTTON_CLASS} hover:text-theme-600`}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-4 pt-1 pb-4 sm:px-6 sm:pb-6">
          {children}
        </div>
      </div>
      {onDelete && (
        <BottomSheet
          open={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          title={title}
        >
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              onDelete();
            }}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-1 text-left text-base font-medium text-red-500 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-5 w-5 shrink-0" />
            {deleteLabel}
          </button>
        </BottomSheet>
      )}
    </dialog>
  );
}
