import { forwardRef, type ComponentProps } from 'react';

/**
 * Text input in the app's style; its border turns red when data-invalid is
 * true. The ref is forwarded so a form can focus it.
 */
export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      {...props}
      className={`w-full rounded-xl border border-theme-200 bg-surface px-4 py-2.5 text-sm text-theme-800 outline-none focus:border-theme-400 data-[invalid=true]:border-red-400 ${className}`}
    />
  ),
);
Input.displayName = 'Input';
