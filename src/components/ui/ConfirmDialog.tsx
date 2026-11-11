import type { RefObject } from 'react';

interface ConfirmDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onConfirm: () => void;
  tone?: 'danger' | 'primary';
}

const CONFIRM_TONE_CLASS = {
  danger: 'bg-red-500 text-white hover:bg-red-600',
  primary: 'bg-theme-500 text-on-accent hover:bg-theme-600',
};

/**
 * "Are you sure?" dialog with Cancel and a confirm button, red by default or
 * green with tone="primary". While `isPending` the button is disabled and shows
 * `pendingLabel`.
 */
export function ConfirmDialog({
  dialogRef,
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
  tone = 'danger',
}: ConfirmDialogProps) {
  return (
    <dialog
      ref={dialogRef}
      className="dialog-fade m-auto w-[calc(100vw-2rem)] max-w-sm rounded-2xl border-none bg-surface p-6 shadow-lg"
    >
      <h3 className="text-lg font-bold text-theme-800">{title}</h3>
      <p className="mt-2 text-sm text-theme-600">{description}</p>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="flex-1 cursor-pointer rounded-xl border border-theme-200 px-4 py-2.5 text-sm font-medium text-theme-600 transition-colors hover:bg-theme-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className={`flex-1 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${CONFIRM_TONE_CLASS[tone]}`}
        >
          {isPending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
