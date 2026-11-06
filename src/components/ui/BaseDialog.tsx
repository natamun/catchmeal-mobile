import { useCallback, type ReactNode, type RefObject } from 'react';
import { Trash2, X } from 'lucide-react';

const MAX_WIDTH_CLASS = {
  sm: 'max-w-sm',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
} as const;

const HEADER_BUTTON_CLASS =
  'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-theme-400 transition-colors hover:bg-theme-50 active:bg-theme-100';

interface BaseDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  title: string;
  maxWidth?: keyof typeof MAX_WIDTH_CLASS;
  /** Shows a trash button next to the close button. */
  onDelete?: () => void;
  onClose?: () => void;
  onDialogNode?: (node: HTMLDialogElement | null) => void;
  children: ReactNode;
}

/**
 * Modal used by every dialog of the app: a native <dialog> opened with
 * showModal(), with a title, a close button and scrollable content. A click on
 * the blurred backdrop closes it (that click lands on the <dialog> element
 * itself). With `onDelete`, a trash button sits next to the close button.
 *
 * `onDialogNode` hands the <dialog> element to the dropdowns, which must render
 * inside it to stay usable above the modal.
 */
export function BaseDialog({
  dialogRef,
  title,
  maxWidth = 'lg',
  onDelete,
  onClose,
  onDialogNode,
  children,
}: BaseDialogProps) {
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
      className={`dialog-fade m-auto w-[calc(100vw-2rem)] ${MAX_WIDTH_CLASS[maxWidth]} overflow-hidden rounded-2xl border-none bg-surface p-0 shadow-lg backdrop:backdrop-blur-sm`}
    >
      <div className="flex max-h-[calc(100dvh-3rem)] flex-col gap-5 overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-lg font-bold text-theme-800">
            {title}
          </h3>
          <div className="-my-2 -mr-2 flex shrink-0 items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className={`${HEADER_BUTTON_CLASS} hover:text-red-500`}
              >
                <Trash2 className="h-6 w-6" />
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

        {children}
      </div>
    </dialog>
  );
}
