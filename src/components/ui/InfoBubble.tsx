import { useEffect, useRef, useState, type ReactNode } from 'react';

import { useDelayedUnmount } from '../../hooks/useDelayedUnmount';

/**
 * A "?" button that shows an explanation in a bubble below it, such as the
 * legend of the macro dots. A press anywhere else closes it.
 */
export function InfoBubble({
  children,
  bubbleClassName = 'w-64',
}: {
  children: ReactNode;
  /** The width of the bubble: a fixed one by default, for a text. */
  bubbleClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isShown = useDelayedUnmount(isOpen, 100);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeIfOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !areaRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeIfOutside, true);
    return () =>
      document.removeEventListener('pointerdown', closeIfOutside, true);
  }, [isOpen]);

  return (
    <div ref={areaRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="tap-area relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-theme-200 text-xs font-bold text-theme-600 transition-colors hover:bg-theme-50"
      >
        ?
      </button>
      {isShown && (
        <div
          className={`absolute top-full right-0 z-10 mt-1.5 ${bubbleClassName} ${isOpen ? 'animate-fade-in-up' : 'animate-fade-out'}`}
        >
          <div className="absolute -top-1 right-2.5 h-2 w-2 rotate-45 border-t border-l border-theme-200 bg-surface" />
          <div className="flex flex-col gap-1.5 rounded-lg border border-theme-200 bg-surface px-3 py-2 text-xs text-theme-700 shadow-sm">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
