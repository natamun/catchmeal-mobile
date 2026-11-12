import type { ComponentProps } from 'react';

/**
 * Text area in the app's style, the twin of Input: it grows with its text up
 * to a limit, then scrolls; its border turns red when data-invalid is true.
 */
export function Textarea({
  className = '',
  ...props
}: ComponentProps<'textarea'>) {
  return (
    <textarea
      {...props}
      className={`field-sizing-content max-h-64 w-full resize-none overflow-y-auto rounded-xl border border-theme-200 bg-surface px-4 py-2.5 text-base text-theme-800 outline-none focus:border-theme-400 data-[invalid=true]:border-red-400 ${className}`}
    />
  );
}
