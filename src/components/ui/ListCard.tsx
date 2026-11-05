import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

interface ListCardProps {
  header?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * White card holding a list, with an optional header (search bar, add button).
 */
export function ListCard({ header, className = '', children }: ListCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-theme-200 bg-surface shadow-sm ${className}`}
    >
      {header && (
        <div className="flex items-center gap-3 border-b border-theme-200 px-5 py-4">
          {header}
        </div>
      )}
      {children}
    </div>
  );
}

/** Spinner shown while a list loads. */
export function ListCardLoading() {
  return (
    <div className="flex justify-center py-10">
      <LoaderCircle className="h-6 w-6 animate-spin text-theme-400" />
    </div>
  );
}

/** Message shown when a list is empty. */
export function ListCardEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="px-5 py-10 text-center text-sm text-theme-400">{children}</p>
  );
}
