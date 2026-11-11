import { useEffect, useRef, type ReactNode, type TouchEvent } from 'react';
import { X } from 'lucide-react';

/** Pixels down before a touch becomes a drag of the sheet. */
const SWIPE_START = 10;
/** A drag this long, or this fast (px per ms), closes the sheet. */
const SWIPE_CLOSE_DISTANCE = 100;
const SWIPE_CLOSE_SPEED = 0.5;
/** Length of the slide in index.css (.sheet-slide). */
const SLIDE_MS = 200;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** A button in the header, before the close button, such as a delete. */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * A sheet that slides up from the bottom of the screen, the mobile pattern for
 * pickers (options, calendars). It is a native <dialog>, so it sits above any
 * other dialog and the Android back button closes it; a tap on the backdrop or
 * a swipe down on its header closes it too. The header (handle, title, close
 * button) stays in place and is the only part that drags the sheet; the content
 * under it only scrolls, so a long list never fights with the swipe. The
 * backdrop is only dimmed, like the dialogs': a blur under a sliding sheet
 * made the opening stutter on the phone.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  action,
  children,
}: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{
    startY: number;
    startTime: number;
    dy: number;
    active: boolean;
  } | null>(null);

  const onTouchStart = (event: TouchEvent) => {
    drag.current = {
      startY: event.touches[0].clientY,
      startTime: event.timeStamp,
      dy: 0,
      active: false,
    };
  };

  const onTouchMove = (event: TouchEvent) => {
    const state = drag.current;
    const dialog = ref.current;
    if (!state || !dialog) return;
    state.dy = event.touches[0].clientY - state.startY;
    // A drag starts past a few pixels down, so a tap on the close button
    // stays a tap.
    if (!state.active) {
      if (state.dy < SWIPE_START) return;
      state.active = true;
      dialog.style.transition = 'none';
    }
    dialog.style.transform = `translateY(${Math.max(state.dy, 0)}px)`;
  };

  const onTouchEnd = (event: TouchEvent) => {
    const state = drag.current;
    const dialog = ref.current;
    drag.current = null;
    if (!state?.active || !dialog) return;
    dialog.style.transition = '';
    const speed = state.dy / Math.max(event.timeStamp - state.startTime, 1);
    if (state.dy > SWIPE_CLOSE_DISTANCE || speed > SWIPE_CLOSE_SPEED) {
      dialog.style.transform = 'translateY(100%)';
      window.setTimeout(() => {
        dialog.style.transform = '';
        onClose();
      }, SLIDE_MS);
    } else {
      dialog.style.transform = '';
    }
  };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="sheet-slide mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-t-2xl border-none bg-surface p-0 shadow-lg"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          className="flex shrink-0 touch-none flex-col gap-3 px-4 pt-3 pb-3"
        >
          <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-theme-200" />
          <div className="flex items-center justify-between gap-3">
            <h3 className="line-clamp-2 min-w-0 flex-1 text-base font-semibold break-words text-theme-800">
              {title}
            </h3>
            {action}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="-mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-theme-400 transition-colors outline-none hover:bg-theme-50 hover:text-theme-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
