import type { ReactNode } from 'react';

/**
 * Bottom of a flow page, staying under the thumb while the page scrolls: the
 * totals, an error if any and the main button.
 */
export function FlowFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 mt-auto -mb-6 flex flex-col gap-3 border-t border-theme-100 bg-theme-50 px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
