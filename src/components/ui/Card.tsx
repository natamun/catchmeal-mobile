import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

interface CardProps {
  /** The card's title, in the accent. */
  title?: string;
  /** Beside the title: a button, a caption, a selector. */
  action?: ReactNode;
  /** Keeps the action right after the title instead of at the far end. */
  inlineAction?: boolean;
  /** A strip on top, ruled off, such as a list's search bar. */
  header?: ReactNode;
  /** No padding, for a list whose rows run from edge to edge. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * The one card of the app: a surface with a frame, one padding and one gap,
 * an optional title with its action, or a ruled header and edge-to-edge
 * content for a list. Its content brings no outer margin of its own.
 */
export function Card({
  title,
  action,
  inlineAction = false,
  header,
  flush = false,
  className = '',
  children,
}: CardProps) {
  return (
    <section
      className={`flex flex-col rounded-2xl border border-theme-200 bg-surface shadow-sm ${flush ? 'overflow-hidden' : 'gap-4 p-5'} ${className}`}
    >
      {header && (
        <div className="flex items-center gap-3 border-b border-theme-200 px-5 py-4">
          {header}
        </div>
      )}
      {(title || action) && (
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${inlineAction ? '' : 'justify-between'}`}
        >
          {title && (
            <h2 className="min-w-0 truncate text-base font-semibold text-theme-500">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Spinner shown while a list in a card loads. */
export function CardLoading() {
  return (
    <div className="flex justify-center py-10">
      <LoaderCircle className="h-6 w-6 animate-spin text-theme-400" />
    </div>
  );
}

/** Spinner shown while a flow page loads what it shows. */
export function PageLoading() {
  return (
    <div className="flex justify-center py-16">
      <LoaderCircle className="h-6 w-6 animate-spin text-theme-400" />
    </div>
  );
}

/** Message shown when a list in a card is empty. */
export function CardEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="px-5 py-10 text-center text-sm text-theme-400">{children}</p>
  );
}
