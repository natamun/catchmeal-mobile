import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { LucideIcon } from 'lucide-react';

import { useDelayedUnmount } from '../../hooks/useDelayedUnmount';

/** How far the toast must be swiped to go, in px; half of it upwards. */
const SWIPE_DISTANCE = 50;

interface ToastProps {
  message: string | null;
  icon: LucideIcon;
  /** Called when the toast is swiped away. */
  onDismiss: () => void;
}

interface Offset {
  x: number;
  y: number;
}

const AT_REST: Offset = { x: 0, y: 0 };

/**
 * The toast itself, displayed by ToastProvider. It uses the popover API, which
 * puts it in the browser's top layer, above any open dialog. A swipe to the
 * side or upwards sends it away at once; a short one lets it come back.
 */
export function Toast({ message, icon: Icon, onDismiss }: ToastProps) {
  const displayedMessage = useDelayedUnmount(message, 150);
  const popoverRef = useRef<HTMLDivElement>(null);
  const origin = useRef<Offset | null>(null);
  const [offset, setOffset] = useState<Offset>(AT_REST);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwiped, setIsSwiped] = useState(false);
  const [shownMessage, setShownMessage] = useState(message);

  // Updating state during render: a new message starts in place, whatever
  // happened to the last one.
  if (message !== shownMessage) {
    setShownMessage(message);
    if (message) {
      setOffset(AT_REST);
      setIsSwiped(false);
    }
  }

  useEffect(() => {
    popoverRef.current?.togglePopover(Boolean(displayedMessage));
  }, [displayedMessage]);

  const grab = (event: PointerEvent<HTMLDivElement>) => {
    origin.current = {
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!origin.current) return;
    setOffset({
      x: event.clientX - origin.current.x,
      y: Math.min(0, event.clientY - origin.current.y),
    });
  };

  const release = () => {
    if (!origin.current) return;
    origin.current = null;
    setIsDragging(false);
    const isFar =
      Math.abs(offset.x) > SWIPE_DISTANCE || offset.y < -SWIPE_DISTANCE / 2;
    if (isFar) {
      setIsSwiped(true);
      setOffset({ x: offset.x * 3, y: offset.y * 3 });
      onDismiss();
    } else {
      setOffset(AT_REST);
    }
  };

  const animation = isSwiped
    ? ''
    : message
      ? 'animate-toast-in'
      : 'animate-toast-out';

  return (
    <div
      ref={popoverRef}
      popover="manual"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+1rem)] bottom-auto z-50 m-0 flex h-auto w-auto justify-center border-0 bg-transparent p-0 px-4"
    >
      {displayedMessage && (
        <div
          onPointerDown={grab}
          onPointerMove={drag}
          onPointerUp={release}
          onPointerCancel={release}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            opacity: isSwiped ? 0 : 1 - Math.min(0.6, Math.abs(offset.x) / 250),
            transition: isDragging
              ? 'none'
              : 'transform 150ms ease-out, opacity 150ms ease-out',
          }}
          className={`pointer-events-auto flex touch-none items-center gap-2 rounded-xl border border-theme-200 bg-surface px-4 py-2.5 text-sm font-medium text-theme-800 shadow-lg select-none ${animation}`}
        >
          <Icon className="h-4 w-4 shrink-0 text-theme-500" />
          {displayedMessage}
        </div>
      )}
    </div>
  );
}
